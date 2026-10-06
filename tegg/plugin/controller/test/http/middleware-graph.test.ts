import { GlobalGraph } from '@eggjs/metadata';
import { mm, type MockApplication } from '@eggjs/mock';
import type { InjectObjectDescriptor } from '@eggjs/tegg-types';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { getFixtures } from '../utils.ts';

describe('plugin/controller/test/http/middleware-graph.test.ts', () => {
  let app: MockApplication;

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/controller-app'),
    });
    await app.ready();
  }, 30_000);

  afterAll(() => {
    return app.close();
  });

  it('middlewareGraphHook should weave cross-module middleware inject edges during graph build', () => {
    const globalGraph = GlobalGraph.instanceFor((app as any)._teggScopeBag);
    expect(globalGraph).toBeTruthy();

    const controllerProtos = globalGraph!.moduleProtoDescriptorMap.get('multi-module-controller');
    const controllerProto = controllerProtos?.find((proto) => proto.name === 'crossModuleMiddlewareController');
    expect(controllerProto).toBeTruthy();

    // middlewareGraphHook runs inside globalGraph.build() and adds an inject
    // edge from the controller proto to every cross-module middleware advice
    // proto. If the hook is registered after build() has already run (or never
    // registered at all), these edges are silently missing.
    const countAdviceProto = globalGraph!.findInjectProto(controllerProto!, {
      objName: 'countAdvice',
    } as InjectObjectDescriptor);
    expect(countAdviceProto).toBeTruthy();
    expect(countAdviceProto!.instanceModuleName).toBe('multi-module-common');

    const fooMethodAdviceProto = globalGraph!.findInjectProto(controllerProto!, {
      objName: 'fooMethodAdvice',
    } as InjectObjectDescriptor);
    expect(fooMethodAdviceProto).toBeTruthy();
    expect(fooMethodAdviceProto!.instanceModuleName).toBe('multi-module-common');
  });

  it('cross-module controller middleware should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest().get('/module/aop/middleware/global').expect(200);
    expect(res.body).toEqual({
      method: 'moduleGlobal',
      count: 0,
      aopList: ['CountAdvice'],
    });
  });

  it('cross-module method middleware should work', async () => {
    app.mockCsrf();
    const res = await app.httpRequest().get('/module/aop/middleware/method').expect(200);
    expect(res.body).toEqual({
      method: 'moduleMethod',
      count: 0,
      aopList: ['CountAdvice', 'FooMethodAdvice'],
    });
  });
});
