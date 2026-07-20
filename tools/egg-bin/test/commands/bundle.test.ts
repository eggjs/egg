import path from 'node:path';

import { describe, expect, it, vi, beforeEach } from 'vitest';

import Bundle from '../../src/commands/bundle.ts';
import { getFixtures } from '../helper.ts';

const bundleMock = vi.hoisted(() => vi.fn());
const standaloneOptionsMock = vi.hoisted(() => vi.fn());
const standaloneRunMock = vi.hoisted(() => vi.fn());

vi.mock('@eggjs/egg-bundler', () => ({
  bundle: bundleMock,
  StandaloneWorkerBundler: class {
    constructor(options: unknown) {
      standaloneOptionsMock(options);
    }

    run() {
      return standaloneRunMock();
    }
  },
}));

describe('test/commands/bundle.test.ts', () => {
  const baseDir = getFixtures('demo-app');

  beforeEach(() => {
    bundleMock.mockReset();
    bundleMock.mockResolvedValue({
      outputDir: path.join(baseDir, 'dist-bundle'),
      manifestPath: path.join(baseDir, '.egg/manifest.json'),
      files: ['server.js'],
    });
    standaloneOptionsMock.mockReset();
    standaloneRunMock.mockReset();
    standaloneRunMock.mockResolvedValue({
      outputDir: path.join(baseDir, 'dist-worker'),
      entry: 'index.mjs',
    });
  });

  it('should pass default options to egg-bundler', async () => {
    await Bundle.run(['--base', baseDir]);

    expect(bundleMock).toHaveBeenCalledTimes(1);
    expect(bundleMock).toHaveBeenCalledWith({
      baseDir,
      outputDir: path.join(baseDir, 'dist-bundle'),
      manifestPath: undefined,
      framework: 'aliyun-egg',
      mode: 'production',
      externals: {
        force: [],
        inline: [],
      },
    });
  });

  it('should pass resolved flag options to egg-bundler', async () => {
    await Bundle.run([
      '--base',
      baseDir,
      '--output',
      'bundle-output',
      '--manifest',
      '.egg/custom-manifest.json',
      '--mode',
      'development',
      '--force-external',
      '@scope/foo',
      '--force-external',
      'bar',
      '--inline-external',
      'baz',
    ]);

    expect(bundleMock).toHaveBeenCalledTimes(1);
    expect(bundleMock).toHaveBeenCalledWith({
      baseDir,
      outputDir: path.join(baseDir, 'bundle-output'),
      manifestPath: path.join(baseDir, '.egg/custom-manifest.json'),
      framework: 'aliyun-egg',
      mode: 'development',
      externals: {
        force: ['@scope/foo', 'bar'],
        inline: ['baz'],
      },
    });
  });

  it('should pass pack aliases to egg-bundler with dot-relative targets resolved from baseDir', async () => {
    await Bundle.run([
      '--base',
      baseDir,
      '--pack-alias',
      'some-package=./node_modules/some-package/index.js',
      '--pack-alias',
      'virtual-module=/abs/virtual-module.js',
    ]);

    expect(bundleMock).toHaveBeenCalledTimes(1);
    expect(bundleMock).toHaveBeenCalledWith({
      baseDir,
      outputDir: path.join(baseDir, 'dist-bundle'),
      manifestPath: undefined,
      framework: 'aliyun-egg',
      mode: 'production',
      externals: {
        force: [],
        inline: [],
      },
      pack: {
        resolve: {
          alias: {
            'some-package': path.join(baseDir, 'node_modules/some-package/index.js'),
            'virtual-module': '/abs/virtual-module.js',
          },
        },
      },
    });
  });

  it('should pass framework package specifier without resolving it to an absolute path', async () => {
    await Bundle.run(['--base', baseDir, '--framework', '@my-org/framework']);

    expect(bundleMock).toHaveBeenCalledTimes(1);
    expect(bundleMock).toHaveBeenCalledWith({
      baseDir,
      outputDir: path.join(baseDir, 'dist-bundle'),
      manifestPath: undefined,
      framework: '@my-org/framework',
      mode: 'production',
      externals: {
        force: [],
        inline: [],
      },
    });
  });

  it('should scan standalone TypeScript metadata in a loader-enabled child process', async () => {
    const standaloneBaseDir = getFixtures('standalone-bundle-ts');
    const originalNodeOptions = process.env.NODE_OPTIONS;
    delete process.env.NODE_OPTIONS;

    try {
      await Bundle.run([
        '--base',
        standaloneBaseDir,
        '--framework',
        path.join(standaloneBaseDir, 'framework.ts'),
        '--entry',
        'worker.ts',
      ]);
    } finally {
      if (originalNodeOptions === undefined) {
        delete process.env.NODE_OPTIONS;
      } else {
        process.env.NODE_OPTIONS = originalNodeOptions;
      }
    }

    expect(standaloneOptionsMock).toHaveBeenCalledTimes(1);
    expect(standaloneOptionsMock).toHaveBeenCalledWith({
      baseDir: path.join(standaloneBaseDir, 'app'),
      entry: path.join(standaloneBaseDir, 'worker.ts'),
      format: 'module',
      outputDir: path.join(standaloneBaseDir, 'dist-worker'),
      manifest: {
        appDir: path.join(standaloneBaseDir, 'app'),
        decoratedFramework: 'DecoratedFramework',
        scannerPid: expect.any(Number),
      },
      excludeModules: [],
      rootPath: standaloneBaseDir,
      mode: 'production',
    });
    expect(standaloneOptionsMock.mock.calls[0][0].manifest.scannerPid).not.toBe(process.pid);
  });
});
