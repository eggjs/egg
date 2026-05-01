import path from 'node:path';

import { getFrameworkPath } from '@eggjs/utils';
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
      framework: getFrameworkPath({ framework: 'egg', baseDir }),
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
      framework: getFrameworkPath({ framework: 'egg', baseDir }),
      mode: 'development',
      tegg: false,
      externals: {
        force: ['@scope/foo', 'bar'],
        inline: ['baz'],
      },
    });
  });
});
