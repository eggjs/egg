import fsp from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Snapshot from '../../src/commands/snapshot.ts';
import { getFixtures } from '../helper.ts';

const bundleMock = vi.hoisted(() => vi.fn());
const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('@eggjs/egg-bundler', () => ({
  bundle: bundleMock,
}));

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return { ...actual, spawn: spawnMock };
});

describe('test/commands/snapshot.test.ts', () => {
  const baseDir = getFixtures('demo-app');

  beforeEach(() => {
    bundleMock.mockReset();
    bundleMock.mockResolvedValue({
      outputDir: path.join(baseDir, 'dist-bundle'),
      manifestPath: path.join(baseDir, '.egg/manifest.json'),
      files: ['worker.js'],
    });
    // The blob is produced by the (mocked) spawned node, so pretend it exists.
    vi.spyOn(fsp, 'access').mockResolvedValue(undefined);
    spawnMock.mockReset();
    // Fake child process that exits cleanly on the next microtask.
    spawnMock.mockImplementation(() => {
      const handlers: Record<string, (arg?: unknown) => void> = {};
      const child = {
        once(event: string, cb: (arg?: unknown) => void) {
          handlers[event] = cb;
          if (event === 'exit') queueMicrotask(() => cb(0));
          return child;
        },
      };
      return child;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function spawnArgs() {
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [bin, args, options] = spawnMock.mock.calls[0] as [string, string[], { env: NodeJS.ProcessEnv }];
    return { bin, args, options };
  }

  it('build bundles in snapshot mode then spawns node --build-snapshot', async () => {
    await Snapshot.run(['build', '--base', baseDir]);

    expect(bundleMock).toHaveBeenCalledTimes(1);
    expect(bundleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseDir,
        outputDir: path.join(baseDir, 'dist-bundle'),
        framework: 'aliyun-egg',
        mode: 'production',
        snapshot: true,
        externals: { force: [], inline: [] },
      }),
    );

    const { bin, args, options } = spawnArgs();
    expect(bin).toBe(process.execPath);
    expect(args).toEqual(
      expect.arrayContaining([
        '--snapshot-blob',
        path.join(baseDir, 'dist-bundle', 'snapshot.blob'),
        '--build-snapshot',
        path.join(baseDir, 'dist-bundle', 'worker.js'),
      ]),
    );
    expect(options.env.EGG_BUNDLE_SNAPSHOT).toBe('build');
  });

  it('build --skip-bundle does not bundle, only spawns the blob build', async () => {
    await Snapshot.run(['build', '--base', baseDir, '--skip-bundle']);

    expect(bundleMock).not.toHaveBeenCalled();
    const { args } = spawnArgs();
    expect(args).toContain('--build-snapshot');
  });

  it('build honours a custom --blob path', async () => {
    await Snapshot.run(['build', '--base', baseDir, '--skip-bundle', '--blob', 'out/app.blob']);

    const { args } = spawnArgs();
    expect(args).toContain(path.join(baseDir, 'out', 'app.blob'));
  });

  it('build --dry-run neither bundles-spawn nor spawns node', async () => {
    await Snapshot.run(['build', '--base', baseDir, '--skip-bundle', '--dry-run']);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('build rejects when the spawned node exits non-zero', async () => {
    spawnMock.mockImplementation(() => {
      const handlers: Record<string, (...a: unknown[]) => void> = {};
      const child = {
        once(event: string, cb: (...a: unknown[]) => void) {
          handlers[event] = cb;
          if (event === 'exit') queueMicrotask(() => cb(1, null));
          return child;
        },
      };
      return child;
    });

    await expect(Snapshot.run(['build', '--base', baseDir, '--skip-bundle'])).rejects.toThrow('exited with code 1');
  });

  it('build rejects when the blob is missing after a successful build', async () => {
    (fsp.access as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOENT'));

    await expect(Snapshot.run(['build', '--base', baseDir, '--skip-bundle'])).rejects.toThrow('no blob was written');
  });
});
