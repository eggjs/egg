import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ExternalsResolver } from '../src/lib/ExternalsResolver.ts';

const fixtureBase = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/externals');
const basicApp = path.join(fixtureBase, 'basic-app');

async function writePackageJson(dir: string, pkg: Record<string, unknown>): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg));
}

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

    it('externalizes a wrapper package whose installed optional dependency is native', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['native-optional-wrapper']).toBe('native-optional-wrapper');
      expect(result['native-optional-platform']).toBe('native-optional-platform');
    });

    it('externalizes a CJS wrapper and its missing optional native platform package', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['missing-native-optional-wrapper']).toBe('missing-native-optional-wrapper');
      expect(result['missing-native-optional-wrapper-linux-x64-gnu']).toBe(
        'missing-native-optional-wrapper-linux-x64-gnu',
      );
    });

    it('recognizes native optional package names with ia32 and aarch64 arch tokens', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-externals-'));
      try {
        await writePackageJson(tempDir, {
          name: 'native-arch-app',
          version: '1.0.0',
          private: true,
          dependencies: {
            'cross-native-wrapper': '1.0.0',
          },
        });
        await writePackageJson(path.join(tempDir, 'node_modules/cross-native-wrapper'), {
          name: 'cross-native-wrapper',
          version: '1.0.0',
          main: './index.cjs',
          optionalDependencies: {
            'cross-native-wrapper-linux-aarch64-gnu': '1.0.0',
            'cross-native-wrapper-win32-ia32-msvc': '1.0.0',
          },
        });

        const result = await new ExternalsResolver({ baseDir: tempDir }).resolve();
        expect(result['cross-native-wrapper']).toBe('cross-native-wrapper');
        expect(result['cross-native-wrapper-linux-aarch64-gnu']).toBe('cross-native-wrapper-linux-aarch64-gnu');
        expect(result['cross-native-wrapper-win32-ia32-msvc']).toBe('cross-native-wrapper-win32-ia32-msvc');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('tier 2: ESM-only packages', () => {
    it('does not externalize a pure-ESM package because externals are loaded through createRequire', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['esm-only']).toBeUndefined();
    });

    it('does not externalize a pure-ESM package whose exports field is a string', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['esm-string-export']).toBeUndefined();
    });

    it('does not externalize a dual-ESM package that exposes a require condition', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['esm-dual']).toBeUndefined();
    });

    it('keeps an import-only native optional wrapper bundled but externalizes its platform packages', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['@cnpmjs/packument']).toBeUndefined();
      expect(result['@cnpmjs/packument-linux-x64-gnu']).toBe('@cnpmjs/packument-linux-x64-gnu');
      expect(result['@cnpmjs/packument-darwin-x64']).toBe('@cnpmjs/packument-darwin-x64');
    });

    it('keeps a root optional import-only native wrapper bundled but externalizes its platform packages', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-externals-'));
      try {
        await writePackageJson(tempDir, {
          name: 'root-optional-native-wrapper-app',
          version: '1.0.0',
          private: true,
          optionalDependencies: {
            '@cnpmjs/packument': '1.7.0',
          },
        });
        await writePackageJson(path.join(tempDir, 'node_modules/@cnpmjs/packument'), {
          name: '@cnpmjs/packument',
          version: '1.7.0',
          type: 'module',
          exports: {
            './package.json': './package.json',
          },
          optionalDependencies: {
            '@cnpmjs/packument-linux-x64-gnu': '1.7.0',
          },
        });

        const result = await new ExternalsResolver({ baseDir: tempDir }).resolve();
        expect(result['@cnpmjs/packument']).toBeUndefined();
        expect(result['@cnpmjs/packument-linux-x64-gnu']).toBe('@cnpmjs/packument-linux-x64-gnu');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('keeps a native optional wrapper bundled when its require export target is not require-able', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-externals-'));
      try {
        await writePackageJson(tempDir, {
          name: 'esm-require-target-app',
          version: '1.0.0',
          private: true,
          dependencies: {
            'esm-require-target-wrapper': '1.0.0',
          },
        });
        await writePackageJson(path.join(tempDir, 'node_modules/esm-require-target-wrapper'), {
          name: 'esm-require-target-wrapper',
          version: '1.0.0',
          type: 'module',
          exports: {
            '.': {
              import: './index.js',
              require: './index.js',
            },
          },
          optionalDependencies: {
            'esm-require-target-wrapper-linux-x64-gnu': '1.0.0',
          },
        });

        const result = await new ExternalsResolver({ baseDir: tempDir }).resolve();
        expect(result['esm-require-target-wrapper']).toBeUndefined();
        expect(result['esm-require-target-wrapper-linux-x64-gnu']).toBe('esm-require-target-wrapper-linux-x64-gnu');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('externalizes a native optional wrapper with a nested require export target', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-externals-'));
      try {
        await writePackageJson(tempDir, {
          name: 'nested-require-app',
          version: '1.0.0',
          private: true,
          dependencies: {
            'nested-require-wrapper': '1.0.0',
          },
        });
        await writePackageJson(path.join(tempDir, 'node_modules/nested-require-wrapper'), {
          name: 'nested-require-wrapper',
          version: '1.0.0',
          type: 'module',
          exports: {
            '.': {
              node: {
                import: './index.js',
                require: './index.cjs',
              },
            },
          },
          optionalDependencies: {
            'nested-require-wrapper-linux-x64-gnu': '1.0.0',
          },
        });

        const result = await new ExternalsResolver({ baseDir: tempDir }).resolve();
        expect(result['nested-require-wrapper']).toBe('nested-require-wrapper');
        expect(result['nested-require-wrapper-linux-x64-gnu']).toBe('nested-require-wrapper-linux-x64-gnu');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('keeps a native optional wrapper bundled when an earlier node condition is not require-able', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-externals-'));
      try {
        await writePackageJson(tempDir, {
          name: 'ordered-condition-app',
          version: '1.0.0',
          private: true,
          dependencies: {
            'ordered-condition-wrapper': '1.0.0',
          },
        });
        await writePackageJson(path.join(tempDir, 'node_modules/ordered-condition-wrapper'), {
          name: 'ordered-condition-wrapper',
          version: '1.0.0',
          type: 'module',
          exports: {
            '.': {
              node: './index.js',
              require: './index.cjs',
            },
          },
          optionalDependencies: {
            'ordered-condition-wrapper-linux-x64-gnu': '1.0.0',
          },
        });

        const result = await new ExternalsResolver({ baseDir: tempDir }).resolve();
        expect(result['ordered-condition-wrapper']).toBeUndefined();
        expect(result['ordered-condition-wrapper-linux-x64-gnu']).toBe('ordered-condition-wrapper-linux-x64-gnu');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });

    it('keeps a native optional wrapper bundled when the first array export fallback is not require-able', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-externals-'));
      try {
        await writePackageJson(tempDir, {
          name: 'array-export-app',
          version: '1.0.0',
          private: true,
          dependencies: {
            'array-export-wrapper': '1.0.0',
          },
        });
        await writePackageJson(path.join(tempDir, 'node_modules/array-export-wrapper'), {
          name: 'array-export-wrapper',
          version: '1.0.0',
          type: 'module',
          exports: {
            '.': ['./index.js', './index.cjs'],
          },
          optionalDependencies: {
            'array-export-wrapper-linux-x64-gnu': '1.0.0',
          },
        });

        const result = await new ExternalsResolver({ baseDir: tempDir }).resolve();
        expect(result['array-export-wrapper']).toBeUndefined();
        expect(result['array-export-wrapper-linux-x64-gnu']).toBe('array-export-wrapper-linux-x64-gnu');
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('tier 3: dependency metadata', () => {
    it('does not externalize framework or helper packages by name alone', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result.egg).toBeUndefined();
      expect(result['@swc/helpers']).toBeUndefined();
      expect(result['@eggjs/some-plugin']).toBeUndefined();
    });

    it('externalizes every peerDependency even if the package is not installed', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['peer-only']).toBe('peer-only');
    });

    it('externalizes every optionalDependency even if the package is not installed', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['optional-only']).toBe('optional-only');
    });

    it('externalizes missing optional peerDependencies declared by installed dependencies', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['optional-peer-host']).toBe('optional-peer-host');
      expect(result['missing-optional-peer']).toBe('missing-optional-peer');
      expect(result['required-peer']).toBeUndefined();
      expect(result['normal-js']).toBeUndefined();
    });

    it('resolves optional peers from the dependent package directory', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-externals-'));
      try {
        await fs.mkdir(path.join(tempDir, 'node_modules/nested-peer-host/node_modules/present-optional-peer'), {
          recursive: true,
        });
        await fs.writeFile(
          path.join(tempDir, 'package.json'),
          JSON.stringify({
            name: 'nested-peer-app',
            version: '1.0.0',
            private: true,
            dependencies: {
              'nested-peer-host': '1.0.0',
            },
          }),
        );
        await fs.writeFile(
          path.join(tempDir, 'node_modules/nested-peer-host/package.json'),
          JSON.stringify({
            name: 'nested-peer-host',
            version: '1.0.0',
            peerDependencies: {
              'present-optional-peer': '^1.0.0',
            },
            peerDependenciesMeta: {
              'present-optional-peer': {
                optional: true,
              },
            },
          }),
        );
        await fs.writeFile(
          path.join(tempDir, 'node_modules/nested-peer-host/node_modules/present-optional-peer/package.json'),
          JSON.stringify({
            name: 'present-optional-peer',
            version: '1.0.0',
          }),
        );

        const result = await new ExternalsResolver({ baseDir: tempDir }).resolve();
        expect(result['nested-peer-host']).toBeUndefined();
        expect(result['present-optional-peer']).toBeUndefined();
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('negative cases', () => {
    it('leaves a plain CJS JS package out of the externals map', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['normal-js']).toBeUndefined();
    });

    it('leaves a package with only plain JS optional dependencies out of the externals map', async () => {
      const result = await new ExternalsResolver({ baseDir: basicApp }).resolve();
      expect(result['optional-js-wrapper']).toBeUndefined();
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
        await expect(resolver.resolve()).rejects.toThrow(
          `[@eggjs/egg-bundler] failed to read ${path.join(tempDir, 'node_modules/bad-json/package.json')}`,
        );
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

    it('inline keeps a native optional wrapper bundled without inlining its platform packages', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        inline: ['@cnpmjs/packument'],
      }).resolve();
      expect(result['@cnpmjs/packument']).toBeUndefined();
      expect(result['@cnpmjs/packument-linux-x64-gnu']).toBe('@cnpmjs/packument-linux-x64-gnu');
      expect(result['@cnpmjs/packument-darwin-x64']).toBe('@cnpmjs/packument-darwin-x64');
    });

    it('force wins over inline when both reference the same package', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        force: ['normal-js'],
        inline: ['normal-js'],
      }).resolve();
      expect(result['normal-js']).toBe('normal-js');
    });

    it('adds missing optional peerDependencies for force-listed packages', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        force: ['optional-peer-host'],
      }).resolve();
      expect(result['optional-peer-host']).toBe('optional-peer-host');
      expect(result['missing-optional-peer']).toBe('missing-optional-peer');
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

    it('inline removes a missing optional peerDependency from externals', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        inline: ['missing-optional-peer'],
      }).resolve();
      expect(result['missing-optional-peer']).toBeUndefined();
    });

    it('force can still externalize framework and helper packages explicitly', async () => {
      const result = await new ExternalsResolver({
        baseDir: basicApp,
        force: ['egg', '@swc/helpers', '@eggjs/some-plugin'],
      }).resolve();
      expect(result.egg).toBe('egg');
      expect(result['@swc/helpers']).toBe('@swc/helpers');
      expect(result['@eggjs/some-plugin']).toBe('@eggjs/some-plugin');
    });
  });
});
