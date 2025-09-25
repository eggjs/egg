import { strict as assert } from 'node:assert';
import path from 'node:path';

import { describe, it, expect } from 'vitest';
import coffee from 'coffee';

import { importResolve, importModule, ImportResolveError, isESM } from '../src/index.ts';
import { getFilepath } from './helper.ts';

describe('test/import.test.ts', () => {
  describe('isESM', () => {
    it('should be true', () => {
      expect(isESM).toBe(true);
    });
  });

  describe('importResolve()', () => {
    it('should import file from typescript under development', () => {
      assert.equal(
        importResolve(path.join(__dirname, '../../../plugins/mock/app')),
        path.join(__dirname, '../../../plugins/mock/src/app.ts')
      );
    });

    it('should import package from typescript under development', () => {
      assert.equal(importResolve(path.join(__dirname, '../../egg')), path.join(__dirname, '../../egg/src/index.ts'));
    });

    it('should work on cjs', () => {
      assert.equal(importResolve(getFilepath('cjs')), getFilepath('cjs/index.js'));
      assert.equal(
        importResolve('./index.js', {
          paths: [getFilepath('cjs')],
        }),
        getFilepath('cjs/index.js')
      );
      assert.equal(importResolve(getFilepath('cjs/exports')), getFilepath('cjs/exports.js'));
      assert.equal(
        importResolve('./exports', {
          paths: [getFilepath('cjs')],
        }),
        getFilepath('cjs/exports.js')
      );
      assert.equal(importResolve(getFilepath('cjs-index')), getFilepath('cjs-index/index.cjs'));
      assert.equal(importResolve(getFilepath('cjs/extend')), getFilepath('cjs/extend/index.js'));
      assert.equal(
        importResolve('./extend', {
          paths: [getFilepath('cjs')],
        }),
        getFilepath('cjs/extend/index.js')
      );
      assert.equal(
        importResolve('../index', {
          paths: [getFilepath('cjs/extend')],
        }),
        getFilepath('cjs/index.js')
      );
      assert.equal(
        importResolve('../../index', {
          paths: [getFilepath('cjs/extend/foo')],
        }),
        getFilepath('cjs/index.js')
      );
    });

    it('should inject commonjs package from {paths}/node_modules', () => {
      assert.equal(
        importResolve('inject', {
          paths: [getFilepath('cjs')],
        }),
        getFilepath('cjs/node_modules/inject/index.js')
      );

      assert.equal(
        importResolve('tsconfig-paths-demo/register', {
          paths: [getFilepath('cjs')],
        }),
        getFilepath('cjs/node_modules/tsconfig-paths-demo/register.js')
      );
    });

    it('should find from {paths} parent node_modules', () => {
      assert.equal(
        importResolve('tsconfig-paths-demo/register', {
          paths: [getFilepath('cjs/node_modules/inject')],
        }),
        getFilepath('cjs/node_modules/tsconfig-paths-demo/register.js')
      );

      assert.equal(
        importResolve('tsconfig-paths-demo/register', {
          paths: [getFilepath('cjs/node_modules/@foo/bar')],
        }),
        getFilepath('cjs/node_modules/tsconfig-paths-demo/register.js')
      );
    });

    it('should throw error when resolve path not exists', () => {
      assert.throws(
        () => {
          importResolve('tsconfig-paths-demo-not-exists/register', {
            paths: [getFilepath('cjs/node_modules/inject')],
          });
        },
        (err: any) => {
          assert.ok(err instanceof ImportResolveError);
          assert.equal(err.name, 'ImportResolveError');
          assert.equal(err.filepath, 'tsconfig-paths-demo-not-exists/register');
          assert.deepEqual(err.paths, [getFilepath('cjs/node_modules/inject')]);
          assert.match(err.stack ?? '', /Cannot find package/);
          assert.match(err.message, /Cannot find package/);
          return true;
        }
      );
    });

    it('should work on commonjs and require exists', async () => {
      const script = getFilepath('cjs/run.js');
      return await coffee
        .fork(script)
        // .debug()
        .expect('stdout', /index\.js/)
        .end();
    });

    it('should work on esm', () => {
      assert.equal(importResolve(getFilepath('esm')), getFilepath('esm/index.js'));
      assert.equal(
        importResolve('./index.js', {
          paths: [getFilepath('esm')],
        }),
        getFilepath('esm/index.js')
      );
      assert.equal(importResolve(getFilepath('esm-index')), getFilepath('esm-index/index.mjs'));
      assert.equal(importResolve(getFilepath('esm/config/plugin')), getFilepath('esm/config/plugin.js'));
      assert.equal(
        importResolve('./config/plugin', {
          paths: [getFilepath('esm')],
        }),
        getFilepath('esm/config/plugin.js')
      );
      assert.throws(() => {
        importResolve(getFilepath('esm/config/plugin.default'));
      }, /Cannot find module/);
    });

    it('should inject esm package from {paths}/node_modules', () => {
      assert.equal(
        importResolve('inject', {
          paths: [getFilepath('esm')],
        }),
        getFilepath('esm/node_modules/inject/index.js')
      );
    });

    it('should work on ts-module', () => {
      assert.equal(importResolve(getFilepath('ts-module')), getFilepath('ts-module/index.ts'));
      assert.equal(importResolve(getFilepath('ts-module/extend')), getFilepath('ts-module/extend/index.ts'));
    });

    it('should work on typescript without dist', () => {
      assert.equal(importResolve(getFilepath('tshy')), getFilepath('tshy/src/index.ts'));
    });

    it('should work on typescript with dist', () => {
      assert.equal(importResolve(getFilepath('tshy-dist')), getFilepath('tshy-dist/dist2/esm/index.js'));
    });

    it('should work on {name}/package.json', () => {
      assert.equal(
        importResolve('egg/package.json', {
          paths: [getFilepath('framework-egg-default')],
        }),
        getFilepath('framework-egg-default/node_modules/egg/package.json')
      );
    });

    it('should work on /path/app => /path/app.js', () => {
      assert.equal(
        importResolve(getFilepath('framework-egg-default/app')),
        getFilepath('framework-egg-default/app.js')
      );
    });
  });

  describe('importModule()', () => {
    it('should work on egg', async () => {
      const obj = await importModule('egg', {
        paths: [path.join(__dirname, '../../../examples/helloworld-typescript')],
      });
      expect(obj.Agent).toBeDefined();
    });

    it('should import extend/index.js from extend on cjs', async () => {
      const obj = await importModule(getFilepath('cjs/extend'));
      assert.equal(obj.extend, true);
    });

    it('should import extend/index.js from extend on ts', async () => {
      const obj = await importModule(getFilepath('ts-module/extend'), {
        importDefaultOnly: true,
      });
      assert.equal(obj.extend, true);
    });

    it('should work on cjs', async () => {
      let obj = await importModule(getFilepath('cjs'));
      // if (process.version.startsWith('v24.')) {
      //   // support `module.exports` on Node.js >=24
      //   assert.deepEqual(Object.keys(obj).sort(), [
      //     'default',
      //     // 'module.exports',
      //     'foo',
      //     'one',
      //   ]);
      // } else {
      //   assert.deepEqual(Object.keys(obj).sort(), ['default', 'foo', 'one']);
      // }
      assert.deepEqual(Object.keys(obj).sort(), ['default', 'foo', 'one']);
      assert.equal(obj.one, 1);
      assert.deepEqual(obj.default, { foo: 'bar', one: 1 });

      obj = await importModule(getFilepath('cjs'), { importDefaultOnly: true });
      assert.deepEqual(obj, { foo: 'bar', one: 1 });

      obj = await importModule(getFilepath('cjs/exports'));
      // if (process.version.startsWith('v23.')) {
      //   // support `module.exports` on Node.js >=23
      //   assert.deepEqual(Object.keys(obj), [
      //     'default',
      //     'foo',
      //     'module.exports',
      //     'one',
      //   ]);
      // } else {
      //   assert.deepEqual(Object.keys(obj), ['default', 'foo', 'one']);
      // }
      assert.deepEqual(Object.keys(obj).sort(), ['default', 'foo', 'one']);
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);
      assert.deepEqual(obj.default, { foo: 'bar', one: 1 });

      obj = await importModule(getFilepath('cjs/exports.js'));
      // if (process.version.startsWith('v23.')) {
      //   // support `module.exports` on Node.js >=23
      //   assert.deepEqual(Object.keys(obj), [
      //     'default',
      //     'foo',
      //     'module.exports',
      //     'one',
      //   ]);
      // } else {
      //   assert.deepEqual(Object.keys(obj), ['default', 'foo', 'one']);
      // }
      assert.deepEqual(Object.keys(obj), ['default', 'foo', 'one']);
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);
      assert.deepEqual(obj.default, { foo: 'bar', one: 1 });

      obj = await importModule(getFilepath('cjs/exports.cjs'));
      // if (process.version.startsWith('v23.')) {
      //   // support `module.exports` on Node.js >=23
      //   assert.deepEqual(Object.keys(obj), [
      //     'default',
      //     'foo',
      //     'module.exports',
      //     'one',
      //   ]);
      // } else {
      //   assert.deepEqual(Object.keys(obj), ['default', 'foo', 'one']);
      // }
      assert.deepEqual(Object.keys(obj), ['default', 'foo', 'one']);
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);
      assert.deepEqual(obj.default, { foo: 'bar', one: 1 });

      obj = await importModule(getFilepath('cjs/es-module-default.js'));
      assert.deepEqual(Object.keys(obj).sort(), ['__esModule', 'default', 'fn', 'foo', 'one']);
      assert.equal(obj.default.foo, 'bar');
      assert.equal(obj.default.one, 1);
      assert.equal(typeof obj.default.fn, 'function');

      obj = await importModule(getFilepath('cjs/es-module-default.js'), {
        importDefaultOnly: true,
      });
      assert.deepEqual(Object.keys(obj).sort(), ['fn', 'foo', 'one']);
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);
      assert.equal(typeof obj.fn, 'function');
    });

    it('should work on esm', async () => {
      let obj = await importModule(getFilepath('esm'));
      assert.deepEqual(Object.keys(obj), ['default', 'one']);
      assert.equal(obj.one, 1);
      assert.deepEqual(obj.default, { foo: 'bar' });

      obj = await importModule('./index.js', {
        paths: [getFilepath('esm')],
      });
      assert.deepEqual(Object.keys(obj), ['default', 'one']);
      assert.equal(obj.one, 1);
      assert.deepEqual(obj.default, { foo: 'bar' });

      obj = await importModule(getFilepath('esm'), { importDefaultOnly: true });
      assert.deepEqual(obj, { foo: 'bar' });

      obj = await importModule(getFilepath('esm/exports'));
      assert.deepEqual(Object.keys(obj), ['foo', 'one']);
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);

      obj = await importModule(getFilepath('esm/exports'), {
        importDefaultOnly: true,
      });
      assert.deepEqual(Object.keys(obj), ['foo', 'one']);
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);

      obj = await importModule(getFilepath('esm/exports.js'));
      assert.deepEqual(Object.keys(obj), ['foo', 'one']);
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);

      obj = await importModule(getFilepath('esm/exports.mjs'));
      assert.deepEqual(Object.keys(obj), ['foo', 'one']);
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);
    });

    it('should work on tshy without dist', async () => {
      let obj = await importModule(getFilepath('tshy'));
      assert.deepEqual(Object.keys(obj), ['default', 'one']);
      assert.equal(obj.one, 1);
      assert.deepEqual(obj.default, { foo: 'bar' });

      obj = await importModule(getFilepath('tshy'), {
        importDefaultOnly: true,
      });
      assert.deepEqual(obj, { foo: 'bar' });
    });

    it('should work on tshy with dist', async () => {
      const obj = await importModule(getFilepath('tshy-dist'));
      assert.equal(obj.one, 2);
    });

    it('should work on ts-module', async () => {
      let obj = await importModule(getFilepath('ts-module'));
      assert.deepEqual(Object.keys(obj).sort(), ['default', 'one']);
      assert.equal(obj.one, 1);
      assert.deepEqual(obj.default, { foo: 'bar' });

      obj = await importModule(getFilepath('ts-module'), {
        importDefaultOnly: true,
      });
      assert.deepEqual(obj, { foo: 'bar' });

      obj = await importModule(getFilepath('ts-module/exports'));
      if (process.version.startsWith('v24.')) {
        // support `module.exports` on Node.js >=24
        assert.deepEqual(Object.keys(obj).sort(), ['foo', 'one']);
      } else {
        assert.deepEqual(Object.keys(obj).sort(), ['foo', 'one']);
      }
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);

      obj = await importModule(getFilepath('ts-module/exports'), {
        importDefaultOnly: true,
      });
      assert.deepEqual(Object.keys(obj), ['foo', 'one']);
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);

      obj = await importModule(getFilepath('ts-module/exports.ts'), {
        importDefaultOnly: true,
      });
      assert.deepEqual(Object.keys(obj), ['foo', 'one']);
      assert.equal(obj.foo, 'bar');
      assert.equal(obj.one, 1);

      obj = await importModule(getFilepath('ts-module/mod'));
      assert.deepEqual(Object.keys(obj), ['default']);
      assert.equal(typeof obj.default, 'function');

      obj = await importModule(getFilepath('ts-module/mod.ts'), {
        importDefaultOnly: true,
      });
      assert.equal(typeof obj, 'function');
    });

    it('should support module.exports = null', async () => {
      assert.equal(
        await importModule(getFilepath('cjs/module-exports-null.js'), {
          importDefaultOnly: true,
        }),
        null
      );
      assert.equal(
        await importModule(getFilepath('cjs/module-exports-null'), {
          importDefaultOnly: true,
        }),
        null
      );
      assert.equal(
        (
          await importModule(getFilepath('cjs/module-exports-null'), {
            importDefaultOnly: false,
          })
        ).default,
        null
      );
    });

    it('should support export default null', async () => {
      assert.equal(
        await importModule(getFilepath('esm/export-default-null.js'), {
          importDefaultOnly: true,
        }),
        null
      );
      assert.equal(
        await importModule(getFilepath('esm/export-default-null'), {
          importDefaultOnly: true,
        }),
        null
      );
      assert.equal(
        (
          await importModule(getFilepath('esm/export-default-null.js'), {
            importDefaultOnly: false,
          })
        ).default,
        null
      );
    });
  });
});
