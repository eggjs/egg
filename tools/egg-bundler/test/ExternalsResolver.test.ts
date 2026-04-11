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

    it('does not externalize a dual-ESM package that exposes a require condition', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['esm-dual']).toBeUndefined();
    });
  });

  describe('tier 3: hard-coded always-external', () => {
    it('externalizes any @eggjs/* package by name alone, without touching disk', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['@eggjs/some-plugin']).toBe('@eggjs/some-plugin');
    });

    it('externalizes every peerDependency even if the package is not installed', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['peer-only']).toBe('peer-only');
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

    it('inline removes a hard-coded @eggjs/* package from externals', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        inline: ['@eggjs/some-plugin'],
      }).resolve();
      expect(result['@eggjs/some-plugin']).toBeUndefined();
    });
  });
});
