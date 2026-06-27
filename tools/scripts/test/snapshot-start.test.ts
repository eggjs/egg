import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Start from '../src/commands/start.ts';

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: spawnMock };
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
});
