import path from 'node:path';
import assert from 'node:assert/strict';

import { mm } from 'mm';

import utils from '../../src/utils/index.js';
import { getFilepath } from '../helper.js';

describe('test/utils/index.test.ts', () => {
  afterEach(mm.restore);

  describe('resolvePath', () => {
    const baseDir = getFilepath('loadfile');

    it('should load object', async () => {
      const filepath1 = utils.resolvePath(path.join(baseDir, 'object.js'));
      assert(filepath1);
      const filepath2 = utils.resolvePath(path.join(baseDir, 'object'));
      assert(filepath2, filepath1);
      assert(filepath2.endsWith('.js'), filepath2);
    });
  });

  describe('loadFile on commonjs', () => {
    const baseDir = getFilepath('loadfile');

    it('should load object', async () => {
      const result = await utils.loadFile(path.join(baseDir, 'object.js'));
      assert.equal(result.a, 1);
    });

    it('should load object2.mjs', async () => {
      const result = await utils.loadFile(path.join(baseDir, 'object2.mjs'));
      assert.equal(result.a, 1);
    });

    it('should load null', async () => {
      const result = await utils.loadFile(path.join(baseDir, 'null.js'));
      assert.equal(result, null);
    });

    it('should load null', async () => {
      const result = await utils.loadFile(path.join(baseDir, 'zero.js'));
      assert.equal(result, 0);
    });

    it('should load es module', async () => {
      const result = await utils.loadFile(path.join(baseDir, 'es-module.js'));
      assert(result.fn);
    });

    it('should load es module with default', async () => {
      const result = await utils.loadFile(
        path.join(baseDir, 'es-module-default.js')
      );
      assert(result.fn);
    });

    it('should load es module with default = null', async () => {
      const result = await utils.loadFile(
        path.join(baseDir, 'es-module-default-null.js')
      );
      assert.equal(result, null);
    });

    it('should load es module with default = async function', async () => {
      const result = await utils.loadFile(
        path.join(baseDir, 'es-module-default-async.js')
      );
      assert(typeof result().then === 'function');
    });

    it('should load es module with default = function returning a promise', async () => {
      const result = await utils.loadFile(
        path.join(baseDir, 'es-module-default-promise.js')
      );
      assert(typeof result().then === 'function');
    });

    it('should load no js file', async () => {
      const buf = await utils.loadFile(path.join(baseDir, 'no-js.yml'));
      let result = buf.toString();
      if (process.platform === 'win32') {
        result = result.replaceAll('\r\n', '\n');
      }
      assert.equal(result, '---\nmap:\n  a: 1\n  b: 2\n');
    });
  });

  describe('loadFile on esm', () => {
    const baseDir = getFilepath('loadfile-esm');

    it('should load object', async () => {
      const result = await utils.loadFile(path.join(baseDir, 'object.js'));
      assert.equal(result.a, 1);
      const result2 = await utils.loadFile(
        utils.resolvePath(path.join(baseDir, 'object'))
      );
      assert.equal(result2.a, 1);
      assert.equal(result2, result);
    });

    it('should load object2.cjs', async () => {
      const result = await utils.loadFile(path.join(baseDir, 'object2.cjs'));
      assert.equal(result.a, 1);
      const result2 = await utils.loadFile(
        utils.resolvePath(path.join(baseDir, 'object2.cjs'))
      );
      assert.equal(result2.a, 1);
      assert.equal(result2, result);
    });

    it('should load null', async () => {
      const result = await utils.loadFile(path.join(baseDir, 'null.js'));
      assert.equal(result, null);
    });

    it('should load null', async () => {
      const result = await utils.loadFile(path.join(baseDir, 'zero.js'));
      assert.equal(result, 0);
    });

    it('should load es module', async () => {
      const result = await utils.loadFile(path.join(baseDir, 'es-module.js'));
      assert(result.fn);
    });

    it('should load es module with default', async () => {
      const result = await utils.loadFile(
        path.join(baseDir, 'es-module-default.js')
      );
      assert(result.fn);
    });

    it('should load es module with default = null', async () => {
      const result = await utils.loadFile(
        path.join(baseDir, 'es-module-default-null.js')
      );
      assert.equal(result, null);
    });

    it('should load es module with default = async function', async () => {
      const result = await utils.loadFile(
        path.join(baseDir, 'es-module-default-async.js')
      );
      assert(typeof result().then === 'function');
    });

    it('should load es module with default = function returning a promise', async () => {
      const result = await utils.loadFile(
        path.join(baseDir, 'es-module-default-promise.js')
      );
      assert(typeof result().then === 'function');
    });

    it('should load no js file', async () => {
      const buf = await utils.loadFile(path.join(baseDir, 'no-js.yml'));
      let result = buf.toString();
      if (process.platform === 'win32') {
        result = result.replaceAll('\r\n', '\n');
      }
      assert.equal(result, '---\nmap:\n  a: 1\n  b: 2\n');
    });
  });
});
