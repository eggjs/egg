import assert from 'node:assert/strict';
import path from 'node:path';

import { request } from '@eggjs/supertest';
import { isFunction, isAsyncFunction } from 'is-type-of';

import { createApp, getFilepath, type Application } from '../../helper.js';

describe('test/loader/mixin/load_controller.test.ts', () => {
  let app: Application;
  before(async () => {
    app = createApp('controller-app');
    await app.loader.loadAll();
    return app.ready();
  });
  after(() => app.close());

  describe('when controller is async function', () => {
    it('should use it as middleware', () => {
      assert(app.controller.asyncFunction);

      return request(app.callback())
        .get('/async-function')
        .expect(200)
        .expect('done');
    });
  });

  describe('when controller is generator function', () => {
    it('should use it as middleware', () => {
      assert(app.controller.generatorFunction);
      assert.equal(
        app.controller.generatorFunction.name,
        'objectControllerMiddleware'
      );
      const classFilePath = path.join(
        app.baseDir,
        'app/controller/generator_function.js'
      );
      assert.equal(
        app.controller.generatorFunction[app.loader.FileLoader.FULLPATH],
        classFilePath
      );

      return request(app.callback())
        .get('/generator-function')
        .expect(200)
        .expect('done');
    });

    it('should first argument is ctx', () => {
      assert(app.controller.generatorFunction);

      return request(app.callback())
        .get('/generator-function-ctx')
        .expect(200)
        .expect('done');
    });
  });

  describe('when controller is object', () => {
    it('should define method which is function', () => {
      assert(app.controller.object.callFunction);
      assert(
        app.controller.object.callFunction.name === 'objectControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/object.js');
      assert(
        app.controller.object.callFunction[app.loader.FileLoader.FULLPATH] ===
          classFilePath + '#callFunction()'
      );

      return request(app.callback())
        .get('/object-function')
        .expect(200)
        .expect('done');
    });

    it('should define method which is generator function', () => {
      assert(app.controller.object.callGeneratorFunction);
      assert(
        app.controller.object.callGeneratorFunction.name ===
          'objectControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/object.js');
      assert(
        app.controller.object.callGeneratorFunction[
          app.loader.FileLoader.FULLPATH
        ] ===
          classFilePath + '#callGeneratorFunction()'
      );

      return request(app.callback())
        .get('/object-generator-function')
        .expect(200)
        .expect('done');
    });

    it('should define method on subObject', () => {
      assert(app.controller.object.subObject.callGeneratorFunction);
      assert(
        app.controller.object.subObject.callGeneratorFunction.name ===
          'objectControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/object.js');
      assert(
        app.controller.object.subObject.callGeneratorFunction[
          app.loader.FileLoader.FULLPATH
        ] ===
          classFilePath + '#subObject.callGeneratorFunction()'
      );

      return request(app.callback())
        .get('/subObject-generator-function')
        .expect(200)
        .expect('done');
    });

    it('should define method on subObject.subSubObject', () => {
      assert(
        app.controller.object.subObject.subSubObject.callGeneratorFunction
      );
      assert(
        app.controller.object.subObject.subSubObject.callGeneratorFunction
          .name === 'objectControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/object.js');
      assert(
        app.controller.object.subObject.subSubObject.callGeneratorFunction[
          app.loader.FileLoader.FULLPATH
        ] ===
          classFilePath + '#subObject.subSubObject.callGeneratorFunction()'
      );

      return request(app.callback())
        .get('/subSubObject-generator-function')
        .expect(200)
        .expect('done');
    });

    it('should define method which is generator function with argument', () => {
      assert(app.controller.object.callGeneratorFunctionWithArg);
      assert(
        app.controller.object.callGeneratorFunctionWithArg.name ===
          'objectControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/object.js');
      assert(
        app.controller.object.callGeneratorFunctionWithArg[
          app.loader.FileLoader.FULLPATH
        ] ===
          classFilePath + '#callGeneratorFunctionWithArg()'
      );

      return request(app.callback())
        .get('/object-generator-function-arg')
        .expect(200)
        .expect('done');
    });

    it('should define method which is async function', () => {
      assert(app.controller.object.callAsyncFunction);
      assert(
        app.controller.object.callAsyncFunction.name ===
          'objectControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/object.js');
      assert(
        app.controller.object.callAsyncFunction[
          app.loader.FileLoader.FULLPATH
        ] ===
          classFilePath + '#callAsyncFunction()'
      );

      return request(app.callback())
        .get('/object-async-function')
        .expect(200)
        .expect('done');
    });

    it('should define method which is async function with argument', () => {
      assert(app.controller.object.callAsyncFunctionWithArg);
      assert(
        app.controller.object.callAsyncFunctionWithArg.name ===
          'objectControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/object.js');
      assert(
        app.controller.object.callAsyncFunctionWithArg[
          app.loader.FileLoader.FULLPATH
        ] ===
          classFilePath + '#callAsyncFunctionWithArg()'
      );

      return request(app.callback())
        .get('/object-async-function-arg')
        .expect(200)
        .expect('done');
    });

    it('should not load properties that are not function', () => {
      assert(!app.controller.object.nofunction);
    });

    it('should match app.resources', async () => {
      await request(app.callback())
        .get('/resources-object')
        .expect(200)
        .expect('index');

      await request(app.callback())
        .post('/resources-object')
        .expect(200)
        .expect('create');

      await request(app.callback()).post('/resources-object/1').expect(404);
    });
  });

  describe('when controller is class', () => {
    it('should define method which is function', () => {
      assert(app.controller.class.callFunction);
      assert(
        app.controller.class.callFunction.name === 'classControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/class.js');
      assert(
        app.controller.class.callFunction[app.loader.FileLoader.FULLPATH] ===
          `${classFilePath}#HomeController.callFunction()`
      );

      return request(app.callback())
        .get('/class-function')
        .expect(200)
        .expect('done');
    });

    it('should define method which is generator function', () => {
      assert(app.controller.class.callGeneratorFunction);
      assert(
        app.controller.class.callGeneratorFunction.name ===
          'classControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/class.js');
      assert(
        app.controller.class.callGeneratorFunction[
          app.loader.FileLoader.FULLPATH
        ] === `${classFilePath}#HomeController.callGeneratorFunction()`
      );

      return request(app.callback())
        .get('/class-generator-function')
        .expect(200)
        .expect('done');
    });

    it('should define method which is generator function with ctx', () => {
      assert(app.controller.class.callGeneratorFunctionWithArg);
      assert(
        app.controller.class.callGeneratorFunctionWithArg.name ===
          'classControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/class.js');
      assert(
        app.controller.class.callGeneratorFunctionWithArg[
          app.loader.FileLoader.FULLPATH
        ] === `${classFilePath}#HomeController.callGeneratorFunctionWithArg()`
      );

      return request(app.callback())
        .get('/class-generator-function-arg')
        .expect(200)
        .expect('done');
    });

    it('should define method which is async function', () => {
      assert(app.controller.class.callAsyncFunction);
      assert(
        app.controller.class.callAsyncFunction.name ===
          'classControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/class.js');
      assert(
        app.controller.class.callAsyncFunction[
          app.loader.FileLoader.FULLPATH
        ] === `${classFilePath}#HomeController.callAsyncFunction()`
      );

      return request(app.callback())
        .get('/class-async-function')
        .expect(200)
        .expect('done');
    });

    it('should define method which is async function with ctx', () => {
      assert(app.controller.class.callAsyncFunctionWithArg);
      assert(
        app.controller.class.callAsyncFunctionWithArg.name ===
          'classControllerMiddleware'
      );
      const classFilePath = path.join(app.baseDir, 'app/controller/class.js');
      assert(
        app.controller.class.callAsyncFunctionWithArg[
          app.loader.FileLoader.FULLPATH
        ] === `${classFilePath}#HomeController.callAsyncFunctionWithArg()`
      );

      return request(app.callback())
        .get('/class-async-function-arg')
        .expect(200)
        .expect('done');
    });

    it('should load class that is inherited from its super class', () => {
      assert(
        app.controller.classInherited.callInheritedFunction.name ===
          'classControllerMiddleware'
      );
      const classFilePath = path.join(
        app.baseDir,
        'app/controller/class_inherited.js'
      );
      assert(
        app.controller.classInherited.callInheritedFunction[
          app.loader.FileLoader.FULLPATH
        ] === `${classFilePath}#HomeController.callInheritedFunction()`
      );

      return request(app.callback())
        .get('/class-inherited-function')
        .expect(200)
        .expect('inherited');
    });

    it('should load inherited class without overriding its own function', () => {
      assert(app.controller.classInherited.callOverriddenFunction);
      assert(
        app.controller.classInherited.callOverriddenFunction.name ===
          'classControllerMiddleware'
      );
      const classFilePath = path.join(
        app.baseDir,
        'app/controller/class_inherited.js'
      );
      assert(
        app.controller.classInherited.callOverriddenFunction[
          app.loader.FileLoader.FULLPATH
        ] === `${classFilePath}#HomeController.callOverriddenFunction()`
      );

      return request(app.callback())
        .get('/class-overridden-function')
        .expect(200)
        .expect('own');
    });

    it('should not load properties that are not function', () => {
      assert(!app.controller.class.nofunction);
    });

    it('should not override constructor', () => {
      assert(
        /\[native code]/.test(app.controller.class.constructor.toString())
      );
    });

    it('should load class that is wrapped by function', () => {
      assert(app.controller.classWrapFunction.get);
      assert(
        app.controller.classWrapFunction.get.name ===
          'classControllerMiddleware'
      );
      const classFilePath = path.join(
        app.baseDir,
        'app/controller/class_wrap_function.js'
      );
      assert(
        app.controller.classWrapFunction.get[app.loader.FileLoader.FULLPATH] ===
          `${classFilePath}#HomeController.get()`
      );

      return request(app.callback())
        .get('/class-wrap-function')
        .expect(200)
        .expect('done');
    });

    it('should match app.resources', async () => {
      await request(app.callback())
        .get('/resources-class')
        .expect(200)
        .expect('index');

      await request(app.callback())
        .post('/resources-class')
        .expect(200)
        .expect('create');

      await request(app.callback()).post('/resources-class/1').expect(404);
    });

    it('should get pathName from Controller instance', () => {
      return request(app.callback())
        .get('/class-pathname')
        .expect(200)
        .expect('controller.admin.config');
    });

    it('should get fullPath from Controller instance', () => {
      return request(app.callback())
        .get('/class-fullpath')
        .expect(200)
        .expect(
          path.join(
            getFilepath('controller-app'),
            'app/controller/admin/config.js'
          )
        );
    });
  });

  describe('only a next argument on controller', () => {
    it('should throw error', async () => {
      try {
        const app = createApp('controller-next-argument');
        await app.loader.loadAll();
        throw new Error('should not run');
      } catch (err: any) {
        assert.match(
          err.message,
          /controller `next` should not use next as argument from file/
        );
      }
    });
  });

  describe('function attribute', () => {
    it('should keep function attribute ok', () => {
      assert(isFunction(app.controller.functionAttr.getAccountInfo));
      assert(isAsyncFunction(app.controller.functionAttr.getAccountInfo));
      assert(app.controller.functionAttr.getAccountInfo.operationType);
      assert(
        app.controller.functionAttr.foo &&
          isAsyncFunction(app.controller.functionAttr.foo.bar)
      );
      assert.deepEqual(app.controller.functionAttr.foo.bar.operationType, {
        value: 'account.foo.bar',
        name: 'account.foo.bar',
        desc: 'account.foo.bar',
        checkSign: true,
      });
    });
  });

  describe('not controller', () => {
    it('should load a number', () => {
      assert(app.controller.number === 123);
    });
  });

  describe('controller in other directory', () => {
    let app: Application;
    before(async () => {
      const baseDir = getFilepath('other-directory');
      app = createApp('other-directory');
      await app.loader.loadCustomApp();
      await app.loader.loadController({
        directory: path.join(baseDir, 'app/other-controller'),
      });
      return app.ready();
    });
    after(() => app.close());

    it('should load', () => {
      assert(app.controller.user);
    });
  });

  describe('when controller.supportParams === true', () => {
    let app: Application;
    before(async () => {
      app = createApp('controller-params');
      await app.loader.loadAll();
      return app.ready();
    });
    after(() => app.close());

    it('should use as controller', async () => {
      await request(app.callback())
        .get('/generator-function')
        .expect(200)
        .expect('done');
      await request(app.callback())
        .get('/class-function')
        .expect(200)
        .expect('done');
      await request(app.callback())
        .get('/object-function')
        .expect(200)
        .expect('done');
    });

    it('should support parameter', async () => {
      assert(app.config.controller);
      assert.equal(app.config.controller.supportParams, true);
      const ctx = { app };
      const args = [1, 2, 3];
      let r = await app.controller.generatorFunction.call(ctx, ...args);
      assert.deepEqual(args, r);
      r = await app.controller.object.callFunction.call(ctx, ...args);
      assert.deepEqual(args, r);
      r = await app.controller.class.generatorFunction.call(ctx, ...args);
      assert.deepEqual(args, r);
      r = await app.controller.class.asyncFunction.call(ctx, ...args);
      assert.deepEqual(args, r);
    });
  });
});
