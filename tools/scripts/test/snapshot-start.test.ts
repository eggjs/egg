import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Start from '../src/commands/start.ts';

const spawnMock = vi.hoisted(() => vi.fn());
// Callback-style execFile mock (the gate promisifies it). A custom `--node` path
// is version-checked through it, so we can simulate any reported version.
const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: spawnMock, execFile: execFileMock };
});

const __dirname = import.meta.dirname;

// Override process.versions.node so the snapshot Node >= 24 gate is exercised
// deterministically regardless of the host Node version (egg-scripts CI runs on
// both Node 22 and 24). Returns a restorer.
function pinNodeVersion(version: string): () => void {
  // Redefine `process.versions` itself rather than its `node` property: in some
  // runtimes `process.versions.node` is non-configurable and a direct
  // defineProperty on it would throw.
  const originalVersions = process.versions;
  Object.defineProperty(process, 'versions', {
    value: { ...originalVersions, node: version },
    configurable: true,
    writable: true,
  });
  return () => {
    Object.defineProperty(process, 'versions', {
      value: originalVersions,
      configurable: true,
      writable: true,
    });
  };
}

describe('test/snapshot-start.test.ts', () => {
  const baseDir = path.join(__dirname, 'fixtures/example');
  let homeDir: string;
  let restoreNodeVersion: (() => void) | undefined;

  beforeEach(async () => {
    // Mock HOME (node-homedir honors MOCK_HOME_DIR) so the shared start pipeline's
    // `mkdir(<HOME>/logs/alinode)` does not touch the real home directory.
    homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-snapshot-start-'));
    process.env.MOCK_HOME_DIR = homeDir;
    spawnMock.mockReset();
    spawnMock.mockImplementation(() => ({
      once: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      unref: vi.fn(),
      disconnect: vi.fn(),
      kill: vi.fn(),
      pid: 4242,
    }));
    // Default execFile to an empty success; individual tests override it to
    // simulate a specific `--node --version` output (or a spawn failure).
    execFileMock.mockReset();
    execFileMock.mockImplementation((_cmd: string, _args: string[], cb: (e: unknown, r?: { stdout: string }) => void) =>
      cb(null, { stdout: '' }),
    );
    // Snapshot restore requires Node >= 24; pin a supported version so the
    // argv-construction tests below do not trip the gate on a Node 22 host.
    restoreNodeVersion = pinNodeVersion('24.18.0');
  });

  afterEach(async () => {
    restoreNodeVersion?.();
    restoreNodeVersion = undefined;
    for (const signal of ['SIGINT', 'SIGQUIT', 'SIGTERM']) {
      process.removeAllListeners(signal);
    }
    delete process.env.MOCK_HOME_DIR;
    vi.restoreAllMocks();
    await fs.rm(homeDir, { recursive: true, force: true });
  });

  function spawnArgs() {
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawnMock.mock.calls[0] as [string, string[], { env: NodeJS.ProcessEnv }];
    return { command, args, options };
  }

  it('boots from the blob via `node --snapshot-blob` instead of the cluster bin', async () => {
    await Start.run(['--snapshot-blob', './snapshot.blob', baseDir]);

    const { command, args, options } = spawnArgs();
    expect(command).toBe('node');
    // self-contained snapshot boot — no egg-cluster server bin
    expect(args.join(' ')).not.toContain('start-cluster');
    expect(args).toEqual(expect.arrayContaining(['--snapshot-blob', path.join(baseDir, 'snapshot.blob')]));
    // --title=... appended for `egg-scripts stop` grep
    expect(args.some((a) => a.startsWith('--title=egg-server-'))).toBe(true);
    expect(options.env.NODE_ENV).toBe('production');
  });

  it('launches the cluster master with explicit app and agent snapshot options', async () => {
    await Start.run([
      '--bundle',
      '--app-snapshot-blob',
      './dist-bundle/app.snapshot.blob',
      '--agent-snapshot-blob',
      './dist-bundle/agent.snapshot.blob',
      '--workers',
      '2',
      baseDir,
    ]);

    const { command, args, options } = spawnArgs();
    expect(command).toBe('node');
    expect(args.join(' ')).toContain('start-cluster');
    expect(args).not.toContain('--snapshot-blob');
    const clusterOptions = JSON.parse(args.find((arg) => arg.startsWith('{'))!);
    expect(clusterOptions).toMatchObject({
      workers: 2,
      appWorkerFile: path.join(baseDir, 'dist-bundle', 'app_worker.js'),
      agentWorkerFile: path.join(baseDir, 'dist-bundle', 'agent_worker.js'),
      appSnapshotBlob: path.join(baseDir, 'dist-bundle', 'app.snapshot.blob'),
      agentSnapshotBlob: path.join(baseDir, 'dist-bundle', 'agent.snapshot.blob'),
    });
    expect(options.env.NODE_ENV).toBe('production');
  });

  it('allows cluster snapshot worker files to be overridden independently', async () => {
    await Start.run([
      '--bundle',
      '--app-snapshot-blob',
      './snapshots/app.blob',
      '--agent-snapshot-blob',
      './snapshots/agent.blob',
      '--app-worker-file',
      './bundle/custom-app.js',
      '--agent-worker-file',
      './bundle/custom-agent.js',
      baseDir,
    ]);

    const { args } = spawnArgs();
    const clusterOptions = JSON.parse(args.find((arg) => arg.startsWith('{'))!);
    expect(clusterOptions.appWorkerFile).toBe(path.join(baseDir, 'bundle', 'custom-app.js'));
    expect(clusterOptions.agentWorkerFile).toBe(path.join(baseDir, 'bundle', 'custom-agent.js'));
  });

  it('uses bundle-dir for default worker files without deriving them from snapshot paths', async () => {
    await Start.run(['--bundle', '--bundle-dir', './output', '--app-snapshot-blob', './snapshots/app.blob', baseDir]);

    const { args } = spawnArgs();
    const clusterOptions = JSON.parse(args.find((arg) => arg.startsWith('{'))!);
    expect(clusterOptions).toMatchObject({
      appWorkerFile: path.join(baseDir, 'output', 'app_worker.js'),
      agentWorkerFile: path.join(baseDir, 'output', 'agent_worker.js'),
      appSnapshotBlob: path.join(baseDir, 'snapshots', 'app.blob'),
    });
    expect(clusterOptions.agentSnapshotBlob).toBeUndefined();
  });

  it('allows only app workers to restore while the agent boots from its bundle entry', async () => {
    await Start.run(['--bundle', '--app-snapshot-blob', './dist-bundle/app.snapshot.blob', baseDir]);

    const { args } = spawnArgs();
    const clusterOptions = JSON.parse(args.find((arg) => arg.startsWith('{'))!);
    expect(clusterOptions).toMatchObject({
      appWorkerFile: path.join(baseDir, 'dist-bundle', 'app_worker.js'),
      agentWorkerFile: path.join(baseDir, 'dist-bundle', 'agent_worker.js'),
      appSnapshotBlob: path.join(baseDir, 'dist-bundle', 'app.snapshot.blob'),
    });
    expect(clusterOptions.agentSnapshotBlob).toBeUndefined();
  });

  it('allows only the agent to restore while app workers boot from their bundle entry', async () => {
    await Start.run(['--bundle', '--agent-snapshot-blob', './dist-bundle/agent.snapshot.blob', baseDir]);

    const { args } = spawnArgs();
    const clusterOptions = JSON.parse(args.find((arg) => arg.startsWith('{'))!);
    expect(clusterOptions).toMatchObject({
      appWorkerFile: path.join(baseDir, 'dist-bundle', 'app_worker.js'),
      agentWorkerFile: path.join(baseDir, 'dist-bundle', 'agent_worker.js'),
      agentSnapshotBlob: path.join(baseDir, 'dist-bundle', 'agent.snapshot.blob'),
    });
    expect(clusterOptions.appSnapshotBlob).toBeUndefined();
  });

  it('starts an ordinary multi-process bundle from the default bundle directory', async () => {
    pinNodeVersion('22.22.3');
    await Start.run(['--bundle', baseDir]);

    const { args } = spawnArgs();
    const clusterOptions = JSON.parse(args.find((arg) => arg.startsWith('{'))!);
    expect(clusterOptions.appWorkerFile).toBe(path.join(baseDir, 'dist-bundle', 'app_worker.js'));
    expect(clusterOptions.agentWorkerFile).toBe(path.join(baseDir, 'dist-bundle', 'agent_worker.js'));
    expect(clusterOptions.appSnapshotBlob).toBeUndefined();
    expect(clusterOptions.agentSnapshotBlob).toBeUndefined();
    expect(clusterOptions.bundle).toBeUndefined();
    expect(clusterOptions['bundle-dir']).toBeUndefined();
  });

  it('rejects options.require for an ordinary multi-process bundle before spawning', async () => {
    await expect(Start.run(['--bundle', '--require', './bootstrap.js', baseDir])).rejects.toThrow(
      /options\.require is not supported with bundled cluster workers/,
    );
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('rejects options.require for cluster snapshot restore before spawning', async () => {
    await expect(
      Start.run([
        '--bundle',
        '--app-snapshot-blob',
        './dist-bundle/app.snapshot.blob',
        '--require',
        './bootstrap.js',
        baseDir,
      ]),
    ).rejects.toThrow(/options\.require is not supported with bundled cluster workers/);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('rejects options.require for single-process snapshot restore before spawning', async () => {
    await expect(
      Start.run(['--snapshot-blob', './snapshot.blob', '--require', './bootstrap.js', baseDir]),
    ).rejects.toThrow(/options\.require is not supported with snapshot restore/);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('silently ignores bundle path and role options without --bundle', async () => {
    pinNodeVersion('22.22.3');
    await Start.run([
      '--bundle-dir',
      './output',
      '--app-worker-file',
      './bundle/custom-app.js',
      '--agent-worker-file',
      './bundle/custom-agent.js',
      '--app-snapshot-blob',
      './snapshots/app.blob',
      '--agent-snapshot-blob',
      './snapshots/agent.blob',
      baseDir,
    ]);

    const { args } = spawnArgs();
    expect(args.join(' ')).toContain('start-cluster');
    const clusterOptions = JSON.parse(args.find((arg) => arg.startsWith('{'))!);
    expect(clusterOptions.appWorkerFile).toBeUndefined();
    expect(clusterOptions.agentWorkerFile).toBeUndefined();
    expect(clusterOptions.appSnapshotBlob).toBeUndefined();
    expect(clusterOptions.agentSnapshotBlob).toBeUndefined();
  });

  it('prefers single-process snapshot when bundle options are also provided', async () => {
    await Start.run([
      '--snapshot-blob',
      './snapshot.blob',
      '--bundle',
      '--app-snapshot-blob',
      './app.snapshot.blob',
      baseDir,
    ]);

    const { args } = spawnArgs();
    expect(args.join(' ')).not.toContain('start-cluster');
    expect(args).toContain('--snapshot-blob');
    expect(args).toContain(path.join(baseDir, 'snapshot.blob'));
  });

  it('passes --port through as PORT env for the snapshot entry to read', async () => {
    await Start.run(['--snapshot-blob', '/abs/app.blob', '--port', '8080', baseDir]);

    const { args, options } = spawnArgs();
    expect(args).toContain('--snapshot-blob');
    expect(args).toContain('/abs/app.blob');
    expect(options.env.PORT).toBe('8080');
  });

  it('accepts the --no-sourcemap negation (sourcemap flag has allowNo)', async () => {
    // Regression guard: the cnpmcore-snapshot e2e job uses --no-sourcemap to keep
    // `--import source-map-support` out of the `node --snapshot-blob` process.
    // Without allowNo:true on the sourcemap flag, oclif rejects --no-sourcemap with
    // NonExistentFlagsError and the start command never spawns.
    await Start.run(['--snapshot-blob', './snapshot.blob', '--no-sourcemap', baseDir]);
    const { args } = spawnArgs();
    expect(args).not.toContain('--import');
  });

  it('refuses to restore on Node.js < 24 with a clear error', async () => {
    // Override the supported-version pin from beforeEach. We can discard this
    // restorer because afterEach's `restoreNodeVersion` (captured in beforeEach
    // before any pin) restores the original host descriptor regardless.
    pinNodeVersion('22.22.3');
    await expect(Start.run(['--snapshot-blob', './snapshot.blob', baseDir])).rejects.toThrow(/Node\.js >= 24/);
    // Gated before spawning the doomed `node --snapshot-blob` child.
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('also refuses cluster snapshot restore on Node.js < 24', async () => {
    pinNodeVersion('22.22.3');
    await expect(Start.run(['--bundle', '--app-snapshot-blob', './app.snapshot.blob', baseDir])).rejects.toThrow(
      /Node\.js >= 24/,
    );
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('queries a custom --node binary and refuses an unsupported version', async () => {
    // A custom `--node /path` is not this runtime, so the gate resolves its version
    // by running `<path> --version` instead of reading process.versions.
    execFileMock.mockImplementation((_cmd: string, _args: string[], cb: (e: unknown, r?: { stdout: string }) => void) =>
      cb(null, { stdout: 'v22.4.1\n' }),
    );
    await expect(
      Start.run(['--snapshot-blob', './snapshot.blob', '--node', '/opt/node22/bin/node', baseDir]),
    ).rejects.toThrow(/Node\.js >= 24/);
    expect(execFileMock).toHaveBeenCalledWith('/opt/node22/bin/node', ['--version'], expect.any(Function));
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('proceeds (fails open) when a custom --node version cannot be determined', async () => {
    // If `<path> --version` cannot run, the gate returns undefined and the launch
    // proceeds rather than blocking on a version it could not read.
    execFileMock.mockImplementation((_cmd: string, _args: string[], cb: (e: unknown) => void) =>
      cb(new Error('spawn ENOENT')),
    );
    await Start.run(['--snapshot-blob', './snapshot.blob', '--node', '/no/such/node', baseDir]);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });
});
