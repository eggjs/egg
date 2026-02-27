import assert from 'node:assert/strict';

import { ControllerType, HTTPMethodEnum } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import {
  AgentInfoUtil,
  ControllerMetaBuilderFactory,
  BodyParamMeta,
  PathParamMeta,
  ControllerInfoUtil,
  MethodInfoUtil,
  HTTPInfoUtil,
} from '../src/index.ts';
import { HTTPControllerMeta } from '../src/model/index.ts';
import { AgentFooController } from './fixtures/AgentFooController.js';

describe('core/controller-decorator/test/AgentController.test.ts', () => {
  describe('decorator metadata', () => {
    it('should set ControllerType.HTTP on the class', () => {
      const controllerType = ControllerInfoUtil.getControllerType(AgentFooController);
      assert.strictEqual(controllerType, ControllerType.HTTP);
    });

    it('should set AGENT_CONTROLLER metadata on the class', () => {
      assert.strictEqual(AgentInfoUtil.isAgentController(AgentFooController), true);
    });

    it('should set fixed base path /api/v1', () => {
      const httpPath = HTTPInfoUtil.getHTTPPath(AgentFooController);
      assert.strictEqual(httpPath, '/api/v1');
    });
  });

  describe('method HTTP metadata', () => {
    const methodRoutes = [
      { methodName: 'createThread', httpMethod: HTTPMethodEnum.POST, path: '/threads' },
      { methodName: 'getThread', httpMethod: HTTPMethodEnum.GET, path: '/threads/:id' },
      { methodName: 'asyncRun', httpMethod: HTTPMethodEnum.POST, path: '/runs' },
      { methodName: 'streamRun', httpMethod: HTTPMethodEnum.POST, path: '/runs/stream' },
      { methodName: 'syncRun', httpMethod: HTTPMethodEnum.POST, path: '/runs/wait' },
      { methodName: 'getRun', httpMethod: HTTPMethodEnum.GET, path: '/runs/:id' },
      { methodName: 'cancelRun', httpMethod: HTTPMethodEnum.POST, path: '/runs/:id/cancel' },
    ];

    for (const route of methodRoutes) {
      it(`should set correct HTTP method for ${route.methodName}`, () => {
        const method = HTTPInfoUtil.getHTTPMethodMethod(AgentFooController, route.methodName);
        assert.strictEqual(method, route.httpMethod);
      });

      it(`should set correct HTTP path for ${route.methodName}`, () => {
        const path = HTTPInfoUtil.getHTTPMethodPath(AgentFooController, route.methodName);
        assert.strictEqual(path, route.path);
      });

      it(`should set ControllerType.HTTP on method ${route.methodName}`, () => {
        const controllerType = MethodInfoUtil.getMethodControllerType(AgentFooController, route.methodName);
        assert.strictEqual(controllerType, ControllerType.HTTP);
      });
    }
  });

  describe('parameter metadata', () => {
    it('should set BODY param at index 0 for asyncRun', () => {
      const paramType = HTTPInfoUtil.getHTTPMethodParamType(0, AgentFooController, 'asyncRun');
      assert.strictEqual(paramType, 'BODY');
    });

    it('should set BODY param at index 0 for streamRun', () => {
      const paramType = HTTPInfoUtil.getHTTPMethodParamType(0, AgentFooController, 'streamRun');
      assert.strictEqual(paramType, 'BODY');
    });

    it('should set BODY param at index 0 for syncRun', () => {
      const paramType = HTTPInfoUtil.getHTTPMethodParamType(0, AgentFooController, 'syncRun');
      assert.strictEqual(paramType, 'BODY');
    });

    it('should set PARAM at index 0 with name "id" for getThread', () => {
      const paramType = HTTPInfoUtil.getHTTPMethodParamType(0, AgentFooController, 'getThread');
      assert.strictEqual(paramType, 'PARAM');
      const paramName = HTTPInfoUtil.getHTTPMethodParamName(0, AgentFooController, 'getThread');
      assert.strictEqual(paramName, 'id');
    });

    it('should set PARAM at index 0 with name "id" for getRun', () => {
      const paramType = HTTPInfoUtil.getHTTPMethodParamType(0, AgentFooController, 'getRun');
      assert.strictEqual(paramType, 'PARAM');
      const paramName = HTTPInfoUtil.getHTTPMethodParamName(0, AgentFooController, 'getRun');
      assert.strictEqual(paramName, 'id');
    });

    it('should set PARAM at index 0 with name "id" for cancelRun', () => {
      const paramType = HTTPInfoUtil.getHTTPMethodParamType(0, AgentFooController, 'cancelRun');
      assert.strictEqual(paramType, 'PARAM');
      const paramName = HTTPInfoUtil.getHTTPMethodParamName(0, AgentFooController, 'cancelRun');
      assert.strictEqual(paramName, 'id');
    });

    it('should not have params for createThread', () => {
      const paramIndexList = HTTPInfoUtil.getParamIndexList(AgentFooController, 'createThread');
      assert.strictEqual(paramIndexList.length, 0);
    });
  });

  describe('context index', () => {
    it('should not set contextIndex on any method', () => {
      const methods = ['createThread', 'getThread', 'asyncRun', 'streamRun', 'syncRun', 'getRun', 'cancelRun'];
      for (const methodName of methods) {
        const contextIndex = MethodInfoUtil.getMethodContextIndex(AgentFooController, methodName);
        assert.strictEqual(contextIndex, undefined, `${methodName} should not have contextIndex`);
      }
    });
  });

  describe('default implementations', () => {
    it('should inject default stubs for all 7 route methods', () => {
      // AgentFooController only implements execRun (smart defaults pattern)
      // All 7 route methods should have stub defaults that throw
      const proto = AgentFooController.prototype as any;
      const routeMethods = ['createThread', 'getThread', 'asyncRun', 'streamRun', 'syncRun', 'getRun', 'cancelRun'];
      for (const methodName of routeMethods) {
        assert(typeof proto[methodName] === 'function', `${methodName} should be a function`);
        assert.strictEqual(
          AgentInfoUtil.isNotImplemented(proto[methodName]),
          true,
          `${methodName} should be marked as AGENT_NOT_IMPLEMENTED`,
        );
      }
    });

    const stubMethods = [
      { name: 'createThread', args: [] },
      { name: 'getThread', args: ['thread_1'] },
      { name: 'asyncRun', args: [{ input: { messages: [] } }] },
      { name: 'streamRun', args: [{ input: { messages: [] } }] },
      { name: 'syncRun', args: [{ input: { messages: [] } }] },
      { name: 'getRun', args: ['run_1'] },
      { name: 'cancelRun', args: ['run_1'] },
    ];

    for (const { name, args } of stubMethods) {
      it(`should throw for unimplemented ${name}`, async () => {
        const instance = new AgentFooController() as any;
        await assert.rejects(() => instance[name](...args), new RegExp(`${name} not implemented`));
      });
    }
  });

  describe('HTTPControllerMetaBuilder integration', () => {
    it('should build metadata with 7 HTTPMethodMeta entries', () => {
      const meta = ControllerMetaBuilderFactory.build(AgentFooController, ControllerType.HTTP) as HTTPControllerMeta;
      assert(meta);
      assert.strictEqual(meta.methods.length, 7);
      assert.strictEqual(meta.path, '/api/v1');
    });

    it('should produce correct route metadata for each method', () => {
      const meta = ControllerMetaBuilderFactory.build(AgentFooController, ControllerType.HTTP) as HTTPControllerMeta;

      const createThread = meta.methods.find((m) => m.name === 'createThread')!;
      assert.strictEqual(createThread.path, '/threads');
      assert.strictEqual(createThread.method, HTTPMethodEnum.POST);
      assert.strictEqual(createThread.paramMap.size, 0);

      const getThread = meta.methods.find((m) => m.name === 'getThread')!;
      assert.strictEqual(getThread.path, '/threads/:id');
      assert.strictEqual(getThread.method, HTTPMethodEnum.GET);
      assert.deepStrictEqual(getThread.paramMap, new Map([[0, new PathParamMeta('id')]]));

      const asyncRun = meta.methods.find((m) => m.name === 'asyncRun')!;
      assert.strictEqual(asyncRun.path, '/runs');
      assert.strictEqual(asyncRun.method, HTTPMethodEnum.POST);
      assert.deepStrictEqual(asyncRun.paramMap, new Map([[0, new BodyParamMeta()]]));

      const streamRun = meta.methods.find((m) => m.name === 'streamRun')!;
      assert.strictEqual(streamRun.path, '/runs/stream');
      assert.strictEqual(streamRun.method, HTTPMethodEnum.POST);
      assert.deepStrictEqual(streamRun.paramMap, new Map([[0, new BodyParamMeta()]]));

      const syncRun = meta.methods.find((m) => m.name === 'syncRun')!;
      assert.strictEqual(syncRun.path, '/runs/wait');
      assert.strictEqual(syncRun.method, HTTPMethodEnum.POST);
      assert.deepStrictEqual(syncRun.paramMap, new Map([[0, new BodyParamMeta()]]));

      const getRun = meta.methods.find((m) => m.name === 'getRun')!;
      assert.strictEqual(getRun.path, '/runs/:id');
      assert.strictEqual(getRun.method, HTTPMethodEnum.GET);
      assert.deepStrictEqual(getRun.paramMap, new Map([[0, new PathParamMeta('id')]]));

      const cancelRun = meta.methods.find((m) => m.name === 'cancelRun')!;
      assert.strictEqual(cancelRun.path, '/runs/:id/cancel');
      assert.strictEqual(cancelRun.method, HTTPMethodEnum.POST);
      assert.deepStrictEqual(cancelRun.paramMap, new Map([[0, new PathParamMeta('id')]]));
    });

    it('should have all real paths start with /', () => {
      const meta = ControllerMetaBuilderFactory.build(AgentFooController, ControllerType.HTTP) as HTTPControllerMeta;
      for (const method of meta.methods) {
        const realPath = meta.getMethodRealPath(method);
        assert(realPath.startsWith('/'), `${method.name} real path "${realPath}" should start with /`);
      }
    });
  });
});
