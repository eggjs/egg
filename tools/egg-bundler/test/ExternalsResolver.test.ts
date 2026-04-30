import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ExternalsResolver } from '../src/lib/ExternalsResolver.ts';

const fixtureBase = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/externals');
const basicApp = path.join(fixtureBase, 'basic-app');

describe('ExternalsResolver', () => {
  describe('tier 1: native binary detection', () => {
    it('externalizes a package whose install script invokes node-gyp', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['native-scripts']).toBe('native-scripts');
    });

    it('externalizes a package that ships a binding.gyp', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['native-binding']).toBe('native-binding');
    });

    it('externalizes a package with a non-empty prebuilds/ directory', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['native-prebuilds']).toBe('native-prebuilds');
    });

    it('externalizes a package that contains a *.node file at its root', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['native-dotnode']).toBe('native-dotnode');
    });
  });

  describe('tier 2: ESM-only detection', () => {
    it('externalizes a pure-ESM package (type=module without require condition)', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['esm-only']).toBe('esm-only');
    });

    it('externalizes a pure-ESM package whose exports field is a string', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['esm-string-export']).toBe('esm-string-export');
    });

    it('does not externalize a dual-ESM package that exposes a require condition', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['esm-dual']).toBeUndefined();
    });
  });

  describe('tier 3: hard-coded always-external', () => {
    it('externalizes @eggjs/* packages by name alone', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['@eggjs/some-plugin']).toBe('@eggjs/some-plugin');
    });

    it('externalizes every peerDependency even if the package is not installed', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['peer-only']).toBe('peer-only');
    });

    it('externalizes every optionalDependency even if the package is not installed', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['optional-only']).toBe('optional-only');
    });
  });

  describe('negative cases', () => {
    it('leaves a plain CJS JS package out of the externals map', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['normal-js']).toBeUndefined();
    });

    it('does not externalize a declared dep that is not installed and matches no rule', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['missing-pkg']).toBeUndefined();
    });

    it('does not throw when the project itself has no package.json', async () => {
      const resolver = new ExternalsResolver({ baseDir: path.join(fixtureBase, 'nonexistent') });
      await expect(resolver.resolve()).resolves.toEqual({});
    });

    it('throws when an installed package has malformed package.json metadata', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-externals-'));
      try {
        await fs.mkdir(path.join(tempDir, 'node_modules/bad-json'), { recursive: true });
        await fs.writeFile(
          path.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'malformed-app',
            version: '1.0.0',
            private: true,
            dependencies: {
              'bad-json': '1.0.0',
            },
          }),
        );
        await fs.writeFile(path.join(tempDir, 'node_modules/bad-json/package.json'), '{\n  "name": "bad-json",');

        const resolver = new ExternalsResolver({ baseDir: tempDir });
        await expect(resolver.resolve()).rejects.toThrow(SyntaxError);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('user overrides', () => {
    it('force adds a normal JS package to externals even though auto-detect skips it', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        force: ['normal-js'],
      }).resolve();
      expect(result['normal-js']).toBe('normal-js');
    });

    it('inline removes an auto-detected native package from externals', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        inline: ['native-scripts'],
      }).resolve();
      expect(result['native-scripts']).toBeUndefined();
    });

    it('force wins over inline when both reference the same package', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        force: ['normal-js'],
        inline: ['normal-js'],
      }).resolve();
      expect(result['normal-js']).toBe('normal-js');
    });

    it('inline removes a peerDependency from externals', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        inline: ['peer-only'],
      }).resolve();
      expect(result['peer-only']).toBeUndefined();
    });

    it('inline removes an optionalDependency from externals', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        inline: ['optional-only'],
      }).resolve();
      expect(result['optional-only']).toBeUndefined();
    });

    it('inline removes a hard-coded @eggjs/* package from externals', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        inline: ['@eggjs/some-plugin'],
      }).resolve();
      expect(result['@eggjs/some-plugin']).toBeUndefined();
    });
  });
});
