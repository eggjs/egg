import { strict as assert } from 'node:assert';

import { afterEach, describe, it } from 'vitest';

import { importModule, importResolve, setSnapshotModuleLoader } from '../src/import.ts';
import { getFilepath } from './helper.ts';

describe('test/snapshot-import.test.ts', () => {
  describe('setSnapshotModuleLoader', () => {
    // setSnapshotModuleLoader mutates module-level state (_snapshotModuleLoader
    // and isESM). Clear it after each test, otherwise the state leaks into every
    // other test file sharing this realm when vitest runs with `isolate: false`,
    // breaking their module resolution ("Can not find plugin ...").
    afterEach(() => {
      setSnapshotModuleLoader(undefined);
    });

    it('should intercept importModule with registered loader', async () => {
      const filepath = getFilepath('esm');
      const resolvedPath = importResolve(filepath);

      const fakeModule = { default: { hello: 'world' }, other: 'stuff' };

      setSnapshotModuleLoader((path) => {
        if (path === resolvedPath) return fakeModule;
        throw new Error(`Unexpected path: ${path}`);
      });

      const result = await importModule(filepath);
      assert.deepEqual(result, fakeModule);
    });

    it('should handle importDefaultOnly option', async () => {
      const filepath = getFilepath('esm');
      const resolvedPath = importResolve(filepath);

      const fakeModule = { default: { greet: 'hi' }, other: 'stuff' };

      setSnapshotModuleLoader((path) => {
        if (path === resolvedPath) return fakeModule;
        throw new Error(`Unexpected path: ${path}`);
      });

      const result = await importModule(filepath, { importDefaultOnly: true });
      assert.deepEqual(result, { greet: 'hi' });
    });

    it('should unwrap __esModule double-default pattern', async () => {
      const filepath = getFilepath('esm');
      const resolvedPath = importResolve(filepath);

      const fakeModule = {
        default: {
          __esModule: true,
          default: { myFunc: 'test' },
        },
      };

      setSnapshotModuleLoader((path) => {
        if (path === resolvedPath) return fakeModule;
        throw new Error(`Unexpected path: ${path}`);
      });

      const result = await importModule(filepath);
      assert.equal(result.__esModule, true);
      assert.deepEqual(result.default, { myFunc: 'test' });
    });

    it('should handle falsy module values', async () => {
      const filepath = getFilepath('esm');
      const resolvedPath = importResolve(filepath);

      setSnapshotModuleLoader((path) => {
        if (path === resolvedPath) return null;
        throw new Error(`Unexpected path: ${path}`);
      });

      const result = await importModule(filepath);
      assert.equal(result, null);
    });

    it('should propagate errors from the loader', async () => {
      const filepath = getFilepath('esm');

      setSnapshotModuleLoader(() => {
        throw new Error('Module not in snapshot bundle');
      });

      await assert.rejects(() => importModule(filepath), { message: 'Module not in snapshot bundle' });
    });

    it('should handle primitive module exports without crashing', async () => {
      const filepath = getFilepath('esm');
      const resolvedPath = importResolve(filepath);

      setSnapshotModuleLoader((path) => {
        if (path === resolvedPath) return 42;
        throw new Error(`Unexpected path: ${path}`);
      });

      const result = await importModule(filepath);
      assert.equal(result, 42);
    });
  });

  describe('getRequire() fallback', () => {
    it('should return a working require function with extensions', async () => {
      const { getRequire } = await import('../src/import.ts');

      const customRequire = getRequire();
      assert.equal(typeof customRequire, 'function');
      assert.ok(customRequire.resolve, 'should have resolve method');
      assert.ok(customRequire.extensions, 'should have extensions property');
    });
  });
});
