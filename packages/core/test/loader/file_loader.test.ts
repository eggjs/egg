// oxlint-disable promise/catch-or-return, promise/prefer-catch, promise/prefer-await-to-then, promise/no-callback-in-promise, promise/avoid-new

import assert from 'node:assert/strict';
import path from 'node:path';
import { isClass } from 'is-type-of';
import yaml from 'js-yaml';
import { FileLoader, CaseStyle } from '../../src/loader/file_loader.js';
import { getFilepath } from '../helper.js';

const dirBase = getFilepath('load_dirs');

describe('test/loader/file_loader.test.ts', () => {
  it('should load files', async () => {
    const services: Record<string, any> = {};
    await new FileLoader({
      directory: path.join(dirBase, 'services'),
      target: services,
    }).load();

    assert(services.dir.abc);
    assert(services.dir.service);
    assert(services.foo);
    assert(services.fooBarHello);
    assert(services.fooService);
    assert(services.hyphenDir.a);
    assert(services.underscoreDir.a);
    assert(services.userProfile);
    assert('load' in services.dir.service);
    assert('app' in services.dir.service);
    assert.equal(services.dir.service.load, true);

    await Promise.all([
      new Promise<void>(resolve => {
        services.foo.get((err: Error, v: string) => {
          assert.ifError(err);
          assert.equal(v, 'bar');
          resolve();
        });
      }),
      new Promise<void>(resolve => {
        services.userProfile.getByName('mk2', (err: Error, user: object) => {
          assert.ifError(err);
          assert.deepEqual(user, { name: 'mk2' });
          resolve();
        });
      }),
    ]);
  });

  it('should not overwrite property', async () => {
    const app = {
      services: {
        foo: {},
      },
    };
    await assert.rejects(async () => {
      await new FileLoader({
        directory: path.join(dirBase, 'services'),
        target: app.services,
      }).load();
    }, /can't overwrite property 'foo'/);
  });

  it('should not overwrite property from loading', async () => {
    const app: Record<string, any> = { services: {} };
    await assert.rejects(async () => {
      await new FileLoader({
        directory: [
          path.join(dirBase, 'services'),
          path.join(dirBase, 'overwrite_services'),
        ],
        target: app.services,
      }).load();
    }, /can't overwrite property 'foo'/);
  });

  it('should overwrite property from loading', async () => {
    const app = { services: {} };
    await new FileLoader({
      directory: [
        path.join(dirBase, 'services'),
        path.join(dirBase, 'overwrite_services'),
      ],
      override: true,
      target: app.services,
    }).load();
  });

  it('should loading without call function', async () => {
    const app: Record<string, any> = { services: {} };
    await new FileLoader({
      directory: path.join(dirBase, 'services'),
      target: app.services,
      call: false,
    }).load();
    assert.deepEqual(app.services.fooService(), { a: 1 });
  });

  it('should loading without call es6 class', async () => {
    const app: Record<string, any> = { services: {} };
    await new FileLoader({
      directory: path.join(dirBase, 'class'),
      target: app.services,
    }).load();
    assert.throws(() => {
      app.services.UserProxy();
    }, /cannot be invoked without 'new'/);
    const instance = new app.services.UserProxy();
    assert.deepEqual(instance.getUser(), { name: 'xiaochen.gaoxc' });
  });

  it('should loading without call babel class', async () => {
    const app: Record<string, any> = { services: {} };
    await new FileLoader({
      directory: path.join(dirBase, 'babel'),
      target: app.services,
    }).load();
    const instance = new app.services.UserProxy();
    assert.deepEqual(instance.getUser(), { name: 'xiaochen.gaoxc' });
  });

  it('should only load property match the filers', async () => {
    const app: Record<string, any> = { middlewares: {} };
    await new FileLoader({
      directory: [
        path.join(dirBase, 'middlewares/default'),
        path.join(dirBase, 'middlewares/app'),
      ],
      target: app.middlewares,
      call: false,
      // filters: [ 'm1', 'm2', 'dm1', 'dm2' ],
    }).load();
    assert(app.middlewares.m1);
    assert(app.middlewares.m2);
    assert(app.middlewares.dm1);
    assert(app.middlewares.dm2);
  });

  it('should support ignore string', async () => {
    const app: Record<string, any> = { services: {} };
    await new FileLoader({
      directory: path.join(dirBase, 'ignore'),
      target: app.services,
      ignore: 'util/**',
    }).load();
    assert.equal(app.services.a.a, 1);
  });

  it('should support ignore array', async () => {
    const app: Record<string, any> = { services: {} };
    await new FileLoader({
      directory: path.join(dirBase, 'ignore'),
      target: app.services,
      ignore: ['util/a.js', 'util/b/b.js'],
    }).load();
    assert.equal(app.services.a.a, 1);
  });

  it('should support lowercase first letter', async () => {
    const app: Record<string, any> = { services: {} };
    await new FileLoader({
      directory: path.join(dirBase, 'lowercase'),
      target: app.services,
      lowercaseFirst: true,
    }).load();
    assert(app.services.someClass);
    assert(app.services.someDir);
    assert(app.services.someDir.someSubClass);
  });

  it('should support options.initializer with es6 class', async () => {
    const app: Record<string, any> = { dao: {} };
    await new FileLoader({
      directory: path.join(dirBase, 'dao'),
      target: app.dao,
      ignore: 'util/**',
      initializer(exports: any, opt) {
        return new exports(app, opt.path);
      },
    }).load();
    assert(app.dao.TestClass);
    assert.deepEqual(app.dao.TestClass.user, { name: 'kai.fangk' });
    assert.equal(app.dao.TestClass.app, app);
    assert.equal(
      app.dao.TestClass.path,
      path.join(dirBase, 'dao/TestClass.js')
    );
    assert.deepEqual(app.dao.testFunction.user, { name: 'kai.fangk' });
    assert.deepEqual(app.dao.testReturnFunction.user, { name: 'kai.fangk' });
  });

  it('should support options.initializer custom type', async () => {
    const app: Record<string, any> = { yml: {} };
    await new FileLoader({
      directory: path.join(dirBase, 'yml'),
      match: '**/*.yml',
      target: app.yml,
      initializer(exports: any) {
        return yaml.load(exports.toString());
      },
    }).load();
    assert(app.yml.config);
    assert.deepEqual(app.yml.config.map, { a: 1, b: 2 });
  });

  it('should pass es6 module', async () => {
    const app: Record<string, any> = { model: {} };
    await new FileLoader({
      directory: path.join(dirBase, 'es6_module'),
      target: app.model,
    }).load();
    assert.equal(app.model.mod.a, 1);
  });

  it('should pass ts module', async () => {
    const app: Record<string, any> = { model: {} };
    await new FileLoader({
      directory: path.join(dirBase, 'ts_module'),
      target: app.model,
    }).load();
    assert.equal(app.model.mod.a, 1);
    assert.equal(app.model.mod2.foo, 'bar');
    assert(app.model.mod2.HelloFoo);
    assert.equal(app.model.mod3.ok, true);
    assert.equal(app.model.mod3.foo, 'bar');
  });

  it('should contain syntax error filepath', async () => {
    const app: Record<string, any> = { model: {} };
    await assert.rejects(async () => {
      await new FileLoader({
        directory: path.join(dirBase, 'syntax_error'),
        target: app.model,
      }).load();
    }, /error: Unexpected identifier/);
  });

  it('should throw when directory contains dot', async () => {
    const mod = {};
    await assert.rejects(async () => {
      await new FileLoader({
        directory: path.join(dirBase, 'error/dotdir'),
        target: mod,
      }).load();
    }, /dot.dir is not match 'a-z0-9_-' in dot.dir\/a.js/);
  });

  it('should throw when directory contains underscore', async () => {
    const mod: Record<string, any> = {};
    await assert.rejects(async () => {
      await new FileLoader({
        directory: path.join(dirBase, 'error/underscore-dir'),
        target: mod,
      }).load();
    }, /_underscore is not match 'a-z0-9_-' in _underscore\/a.js/);
    await assert.rejects(async () => {
      await new FileLoader({
        directory: path.join(dirBase, 'error/underscore-file-in-dir'),
        target: mod,
      }).load();
    }, /_a is not match 'a-z0-9_-' in dir\/_a.js/);
  });

  it('should throw when file starts with underscore', async () => {
    const mod: Record<string, any> = {};
    await assert.rejects(async () => {
      await new FileLoader({
        directory: path.join(dirBase, 'error/underscore-file'),
        target: mod,
      }).load();
    }, /_private is not match 'a-z0-9_-' in _private.js/);
  });

  describe('caseStyle', () => {
    it('should load when caseStyle = upper', async () => {
      const target: Record<string, any> = {};
      await new FileLoader({
        directory: path.join(dirBase, 'camelize'),
        target,
        caseStyle: CaseStyle.upper,
      }).load();

      assert(target.FooBar1);
      assert(target.FooBar2);
      assert(target.FooBar3);
      assert(target.FooBar4);
    });

    it('should load when caseStyle = camel', async () => {
      const target: Record<string, any> = {};
      await new FileLoader({
        directory: path.join(dirBase, 'camelize'),
        target,
        caseStyle: CaseStyle.camel,
      }).load();

      assert(target.fooBar1);
      assert(target.fooBar2);
      assert(target.FooBar3);
      assert(target.fooBar4);
    });

    it('should load when caseStyle = lower', async () => {
      const target: Record<string, any> = {};
      await new FileLoader({
        directory: path.join(dirBase, 'camelize'),
        target,
        caseStyle: CaseStyle.lower,
      }).load();

      assert(target.fooBar1);
      assert(target.fooBar2);
      assert(target.fooBar3);
      assert(target.fooBar4);
    });

    it('should load when caseStyle is function', async () => {
      const target: Record<string, any> = {};
      await new FileLoader({
        directory: path.join(dirBase, 'camelize'),
        target,
        caseStyle(filepath) {
          return filepath
            .replace('.js', '')
            .split('/')
            .map(property => property.replaceAll('_', ''));
        },
      }).load();

      assert(target.foobar1);
      assert(target.fooBar2);
      assert(target.FooBar3);
      assert(target['foo-bar4']);
    });

    it('should throw when caseStyle do not return array', async () => {
      const target: Record<string, any> = {};
      await assert.rejects(async () => {
        await new FileLoader({
          directory: path.join(dirBase, 'camelize'),
          target,
          caseStyle(filepath: string) {
            return filepath as any;
          },
        }).load();
      }, /caseStyle expect an array, but got/);
    });

    it('should be overridden by lowercaseFirst', async () => {
      const target: Record<string, any> = {};
      await new FileLoader({
        directory: path.join(dirBase, 'camelize'),
        target,
        caseStyle: CaseStyle.upper,
        lowercaseFirst: true,
      }).load();

      assert(target.fooBar1);
      assert(target.fooBar2);
      assert(target.fooBar3);
      assert(target.fooBar4);
    });
  });

  it('should load files with inject', async () => {
    const inject: Record<string, any> = {};
    const target: Record<string, any> = {};
    await new FileLoader({
      directory: path.join(dirBase, 'inject'),
      target,
      inject,
    }).load();

    assert.equal(inject.b, true);

    const instance = new target.a(inject);
    assert(instance);
    assert.equal(inject.a, true);
  });

  it('should load files with filter', async () => {
    const target: Record<string, any> = {};
    await new FileLoader({
      directory: path.join(dirBase, 'filter'),
      target,
      filter(obj) {
        return Array.isArray(obj);
      },
    }).load();
    assert.deepEqual(Object.keys(target), ['arr']);

    await new FileLoader({
      directory: path.join(dirBase, 'filter'),
      target,
      filter(obj) {
        return isClass(obj);
      },
    }).load();
    assert.deepEqual(Object.keys(target), ['arr', 'class']);
  });
});
