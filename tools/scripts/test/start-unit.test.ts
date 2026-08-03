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

// Subclass to stub the cluster framework/server-bin resolution so the test does
// not depend on a real egg install under the fixture.
class TestStart extends (Start as any) {
  async getFrameworkPath() {
    return '/fake/framework';
  }
  async getServerBin() {
    return '/fake/scripts/start-cluster.cjs';
  }
}

const __dirname = import.meta.dirname;

describe('test/start-unit.test.ts', () => {
  const baseDir = path.join(__dirname, 'fixtures/example');
  let homeDir: string;

  beforeEach(async () => {
    homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-start-unit-'));
    process.env.MOCK_HOME_DIR = homeDir;
    spawnMock.mockReset();
  });

  afterEach(async () => {
    for (const signal of ['SIGINT', 'SIGQUIT', 'SIGTERM']) {
      process.removeAllListeners(signal);
    }
    delete process.env.MOCK_HOME_DIR;
    vi.restoreAllMocks();
    await fs.rm(homeDir, { recursive: true, force: true });
  });

  // foreground mode waits for the child inside run(), so tests must report a
  // child exit for the command to settle
  async function runStartWithChildExit(code: number | null, signal: NodeJS.Signals | null): Promise<void> {
    let onExit: ((code: number | null, signal: NodeJS.Signals | null) => void) | undefined;
    spawnMock.mockImplementation(() => ({
      once: vi.fn((event: string, cb: (code: number | null, signal: NodeJS.Signals | null) => void) => {
        if (event === 'exit') onExit = cb;
      }),
    }));
    const run = TestStart.run(['--workers=1', baseDir]);
    await vi.waitFor(() => {
      if (!onExit) throw new Error('child not spawned yet');
    });
    onExit!(code, signal);
    return run;
  }

  it('cluster mode spawns the start-cluster server bin with cluster options', async () => {
    await runStartWithChildExit(0, null);

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawnMock.mock.calls[0] as [string, string[], { env: NodeJS.ProcessEnv }];
    expect(command).toBe('node');
    expect(args).toContain('/fake/scripts/start-cluster.cjs');
    expect(args.some((a) => a.startsWith('--title=egg-server-'))).toBe(true);
    // cluster options JSON carries baseDir + framework
    expect(args.some((a) => a.includes('"baseDir"') && a.includes('/fake/framework'))).toBe(true);
    // not a snapshot boot
    expect(args).not.toContain('--snapshot-blob');
    expect(options.env.NODE_ENV).toBe('production');
  });

  it('daemon mode backgrounds once the child reports egg-ready over IPC', async () => {
    const unref = vi.fn();
    const disconnect = vi.fn();
    spawnMock.mockImplementation(() => {
      const child: any = {
        once: vi.fn().mockReturnThis(),
        on: vi.fn((event: string, cb: (msg: unknown) => void) => {
          // emit egg-ready synchronously so checkStatus() resolves immediately
          if (event === 'message') cb({ action: 'egg-ready', data: { address: '127.0.0.1:7001' } });
          return child;
        }),
        unref,
        disconnect,
        kill: vi.fn(),
        pid: 2222,
      };
      return child;
    });

    await TestStart.run(['--daemon', '--workers=1', baseDir]);

    expect(spawnMock).toHaveBeenCalledTimes(1);
    // egg-ready handler unref/disconnects the daemonized child
    expect(unref).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('foreground mode mirrors the child exit code and maps signal deaths to 128+n', async () => {
    // a non-zero exit code is mirrored as-is through oclif's exit path
    await expect(runStartWithChildExit(3, null)).rejects.toMatchObject({ oclif: { exit: 3 } });

    // a signal death reports code=null: mirrored as 128 + signal number
    // instead of resolving as success
    await expect(runStartWithChildExit(null, 'SIGKILL')).rejects.toMatchObject({
      oclif: { exit: 128 + os.constants.signals.SIGKILL },
    });
  });
});
