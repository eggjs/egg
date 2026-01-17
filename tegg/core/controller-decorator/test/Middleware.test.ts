import assert from 'node:assert/strict';

import { describe, it } from 'vite-plus/test';

import { ControllerInfoUtil, MethodInfoUtil } from '../src/index.js';
import {
  AopMiddlewareController,
  BarAdvice,
  BarMethodAdvice,
  FooAdvice,
  FooMethodAdvice,
} from './fixtures/AopMiddlewareController.js';
import { MiddlewareController, MiddlewaresController } from './fixtures/MiddlewareController.js';

describe('test/Middleware.test.ts', () => {
  it('should work', () => {
    const controllerMws = ControllerInfoUtil.getControllerMiddlewares(MiddlewareController);
    const methodMws = MethodInfoUtil.getMethodMiddlewares(MiddlewareController, 'hello');
    assert.equal(controllerMws.length, 1);
    assert.equal(methodMws.length, 2);
  });
  it('Middleware with muti params should work', () => {
    const controllerMws = ControllerInfoUtil.getControllerMiddlewares(MiddlewaresController);
    const methodMws = MethodInfoUtil.getMethodMiddlewares(MiddlewaresController, 'hello');
    assert.equal(controllerMws.length, 1);
    assert.equal(methodMws.length, 2);
  });

  it('controller Aop Middleware should work', () => {
    const controllerAopMws = ControllerInfoUtil.getControllerAopMiddlewares(AopMiddlewareController);
    const helloMethodMws = MethodInfoUtil.getMethodAopMiddlewares(AopMiddlewareController, 'hello');
    const byeMethodMws = MethodInfoUtil.getMethodAopMiddlewares(AopMiddlewareController, 'bye');
    assert.deepEqual(controllerAopMws, [FooAdvice, BarAdvice]);
    assert.deepEqual(helloMethodMws, [FooMethodAdvice, BarMethodAdvice]);
    assert.deepEqual(byeMethodMws, []);
  });
});
