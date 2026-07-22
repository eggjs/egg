import assert from 'node:assert';

import type { ControllerMetadata, ControllerTypeLike } from '@eggjs/tegg-types';
import { ControllerType, HTTPMethodEnum } from '@eggjs/tegg-types';
import { describe, it, beforeEach } from 'vitest';

import {
  BodyParamMeta,
  ControllerMetaBuilderFactory,
  ParamMeta,
  HeadersParamMeta,
  PathParamMeta,
  QueriesParamMeta,
  QueryParamMeta,
  HTTPControllerMeta,
} from '../../src/index.js';
import {
  AopMiddlewareController,
  BarAdvice,
  BarMethodAdvice,
  FooAdvice,
  FooMethodAdvice,
} from '../fixtures/AopMiddlewareController.js';
import {
  ControllerWithParam,
  DefaultValueController,
  Error1Controller,
  Error2Controller,
  FooController,
  FoxController,
  FxxController,
} from '../fixtures/HTTPFooController.js';
import { PriorityController, TooLongController } from '../fixtures/HTTPPriorityController.js';

describe('core/controller-decorator/test/http/HTTPMeta.test.ts', () => {
  it('should work', () => {
    const fooControllerMetaData = ControllerMetaBuilderFactory.build(
      FooController,
      ControllerType.HTTP,
    )! as HTTPControllerMeta;
    assert(fooControllerMetaData.protoName === 'fooController');
    assert(fooControllerMetaData.controllerName === 'FooController');
    assert(fooControllerMetaData.className === 'FooController');
    assert(fooControllerMetaData.path === '/foo');
    assert(fooControllerMetaData.middlewares.length === 1);
    assert(fooControllerMetaData.methods.length === 1);
    const barMethodMetaData = fooControllerMetaData.methods[0];
    assert(barMethodMetaData.name === 'bar');
    assert(barMethodMetaData.path === '/bar/:id');
    assert(barMethodMetaData.method === HTTPMethodEnum.POST);
    assert(barMethodMetaData.contextParamIndex === 0);
    assert(barMethodMetaData.middlewares.length === 2);
    const expectParamTypeMap = new Map<number, ParamMeta>([
      [1, new BodyParamMeta()],
      [2, new QueryParamMeta('query')],
      [3, new QueriesParamMeta('queries')],
      [4, new PathParamMeta('id')],
    ]);
    assert.deepStrictEqual(barMethodMetaData.paramMap, expectParamTypeMap);
  });

  it('controller name should work', () => {
    const fxxControllerMetaData = ControllerMetaBuilderFactory.build(
      FoxController,
      ControllerType.HTTP,
    )! as HTTPControllerMeta;
    assert(fxxControllerMetaData.controllerName === 'FxxController');
    assert(fxxControllerMetaData.protoName === 'foxController');
    assert(fxxControllerMetaData.className === 'FoxController');
  });

  it('proto name should work', () => {
    const fxxControllerMetaData = ControllerMetaBuilderFactory.build(
      FxxController,
      ControllerType.HTTP,
    )! as HTTPControllerMeta;
    assert(fxxControllerMetaData.protoName === 'FooController');
    assert(fxxControllerMetaData.className === 'FxxController');
    assert(fxxControllerMetaData.controllerName === 'FxxController');
  });

  it('should support param with default value', () => {
    const controllerMeta = ControllerMetaBuilderFactory.build(DefaultValueController)! as HTTPControllerMeta;
    const methodMeta = controllerMeta.methods[0];
    assert(methodMeta.paramMap.size === 3);
  });

  describe('param has no decorator', () => {
    it('should throw error', () => {
      assert.throws(() => {
        const builder = ControllerMetaBuilderFactory.createControllerMetaBuilder(Error1Controller)!;
        builder.build();
      }, /param 1 has no http param type/);
    });
  });

  describe('controller has param', () => {
    it('should throw error', () => {
      const controllerMeta = ControllerMetaBuilderFactory.build(ControllerWithParam)! as HTTPControllerMeta;
      const methodMeta = controllerMeta.methods[0];
      const expectParamTypeMap = new Map<number, ParamMeta>([
        [3, new HeadersParamMeta()],
        [2, new PathParamMeta('fooId')],
        [1, new PathParamMeta('id')],
      ]);
      assert.deepStrictEqual(methodMeta.paramMap, expectParamTypeMap);
    });
  });

  describe('param after default param has no decorator', () => {
    it('should throw error', () => {
      assert.throws(() => {
        const builder = ControllerMetaBuilderFactory.createControllerMetaBuilder(Error1Controller)!;
        builder.build();
      }, /param 1 has no http param type/);
    });
  });

  it('should check decorator', () => {
    assert.throws(() => {
      const builder = ControllerMetaBuilderFactory.createControllerMetaBuilder(Error2Controller)!;
      builder.build();
    }, /param 1 has no http param type/);
  });

  describe('priority', () => {
    let priorityMeta: HTTPControllerMeta;

    beforeEach(() => {
      priorityMeta = ControllerMetaBuilderFactory.build(PriorityController, ControllerType.HTTP)! as HTTPControllerMeta;
    });

    describe('path is /foo/*', () => {
      it('should equals 1000', () => {
        const methodMeta = priorityMeta.methods.find((t) => t.name === 'regexpMethod')!;
        assert(methodMeta.priority === 1000);
      });
    });

    describe('path is /foo/users/:id', () => {
      it('should equals 2000', () => {
        const methodMeta = priorityMeta.methods.find((t) => t.name === 'paramMethod')!;
        assert(methodMeta.priority === 2000);
      });
    });

    describe('path is /web/users/*', () => {
      it('should equals 3000', () => {
        const methodMeta = priorityMeta.methods.find((t) => t.name === 'regexpMethod2')!;
        assert(methodMeta.priority === 3000);
      });
    });

    describe('too long path', () => {
      it('should throw error', () => {
        const builder = ControllerMetaBuilderFactory.createControllerMetaBuilder(
          TooLongController,
          ControllerType.HTTP,
        )!;
        assert.throws(() => {
          builder.build();
        }, /path \/:id1\/:id2\/:id3\/:id4\/:id5\/:id6\/:id7\/:id8\/:id9\/:id10\/:id11\/:id12\/:id13\/:id14\/:id15 is too long, should set priority manually/);
      });
    });
  });

  it('should build extension controller types without an execution policy', () => {
    const extensionType = 'CHAIR_EXTENSION_TEST' as ControllerTypeLike;
    class ExtensionController {
      hello(): void {
        // ...
      }
    }
    ControllerMetaBuilderFactory.registerControllerMetaBuilder(extensionType, () => ({
      build: () =>
        ({
          type: extensionType,
          className: ExtensionController.name,
          protoName: 'extensionController',
          controllerName: ExtensionController.name,
          middlewares: [],
          methods: [{ name: 'hello', middlewares: [], contextParamIndex: undefined }],
        }) as ControllerMetadata,
    }));

    const metadata = ControllerMetaBuilderFactory.build(ExtensionController, extensionType);

    assert.equal(metadata?.type, extensionType);
  });

  it('should materialize Advice middleware in controller metadata', () => {
    const metadata = ControllerMetaBuilderFactory.build(
      AopMiddlewareController,
      ControllerType.HTTP,
    ) as HTTPControllerMeta;
    const hello = metadata.methods.find((method) => method.name === 'hello')!;
    const bye = metadata.methods.find((method) => method.name === 'bye')!;

    assert.deepEqual(metadata.advices, [FooAdvice, BarAdvice]);
    assert.deepEqual(hello.advices, [FooMethodAdvice, BarMethodAdvice]);
    const helloAdvices = metadata.getMethodAdvices(hello);
    assert.deepEqual(
      helloAdvices.map((advice) => advice.clazz),
      [FooMethodAdvice, BarMethodAdvice, FooAdvice, BarAdvice],
    );
    assert.deepEqual(
      helloAdvices.map((advice) => advice.objectName),
      [
        'controller-advice:AopMiddlewareController#hello#FooMethodAdvice#0',
        'controller-advice:AopMiddlewareController#hello#BarMethodAdvice#1',
        'controller-advice:AopMiddlewareController#hello#FooAdvice#2',
        'controller-advice:AopMiddlewareController#hello#BarAdvice#3',
      ],
    );
    assert.deepEqual(
      metadata.getMethodAdvices(bye).map((advice) => advice.clazz),
      [FooAdvice, BarAdvice],
    );
  });
});
