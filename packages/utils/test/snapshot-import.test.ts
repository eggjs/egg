import { strict as assert } from 'node:assert';

import { afterEach, describe, it } from 'vitest';

import { importModule, importResolve, setSnapshotModuleLoader } from '../src/import.ts';
import { getFilepath } from './helper.ts';

describe('test/snapshot-import.test.ts', () => {
  describe('setSnapshotModuleLoader', () => {
    // We need to capture and restore isESM since setSnapshotModuleLoader mutates it.
    // Use dynamic import to read the current value.
    afterEach(async () => {
      // Reset the snapshot loader by setting it to a no-op then clearing via
      // module internals. Since there's no public "unset" API, we re-import
      // and the module-level _snapshotModuleLoader remains set — but tests
      // are isolated enough that this is fine. We'll use a different approach:
      // just call setSnapshotModuleLoader with a passthrough that calls the
      // real import, but that changes isESM. Instead, we accept that these
      // tests run with the loader set and each test overrides it.
      // Reset by overwriting with undefined via the setter trick:
      // Actually we can't unset. Let's just re-import fresh for isolation.
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
