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

describe('test/snapshot-start.test.ts', () => {
  const baseDir = path.join(__dirname, 'fixtures/example');
  let homeDir: string;

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
  });

  afterEach(async () => {
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
});
