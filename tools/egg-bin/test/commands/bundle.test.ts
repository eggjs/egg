import path from 'node:path';

import { describe, expect, it, vi, beforeEach } from 'vitest';

import Bundle from '../../src/commands/bundle.ts';
import { getFixtures } from '../helper.ts';

const bundleMock = vi.hoisted(() => vi.fn());

vi.mock('@eggjs/egg-bundler', () => ({
  bundle: bundleMock,
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
  });

  it('should pass default options to egg-bundler', async () => {
    await Bundle.run(['--base', baseDir]);

    expect(bundleMock).toHaveBeenCalledTimes(1);
    expect(bundleMock).toHaveBeenCalledWith({
      baseDir,
      outputDir: path.join(baseDir, 'dist-bundle'),
      manifestPath: undefined,
      framework: 'egg',
      mode: 'production',
      tegg: true,
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
      '--no-tegg',
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
      framework: 'egg',
      mode: 'development',
      tegg: false,
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
      framework: 'egg',
      mode: 'production',
      tegg: true,
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
      tegg: true,
      externals: {
        force: [],
        inline: [],
      },
    });
  });
});
