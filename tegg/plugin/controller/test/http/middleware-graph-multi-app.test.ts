import assert from 'node:assert/strict';

import { GlobalGraph } from '@eggjs/metadata';
import { mm } from '@eggjs/mock';
import type { InjectObjectDescriptor, ProtoDescriptor } from '@eggjs/tegg-types';
import { afterEach, describe, it } from 'vitest';

import { getFixtures } from '../utils.ts';

function findControllerProto(globalGraph: GlobalGraph): ProtoDescriptor | undefined {
  return globalGraph.moduleProtoDescriptorMap
    .get('multi-module-controller')
    ?.find((proto) => proto.name === 'crossModuleMiddlewareController');
}

function findCountAdviceInject(globalGraph: GlobalGraph, controllerProto: ProtoDescriptor) {
  return globalGraph.findInjectProto(controllerProto, {
    objName: 'countAdvice',
  } as InjectObjectDescriptor);
}

describe('plugin/controller/test/http/middleware-graph-multi-app.test.ts', () => {
  afterEach(() => {
    return mm.restore();
  });

  it('should scope buffered middlewareGraphHook per app under concurrent boot', async () => {
    // Both apps load the SAME cross-module middleware fixture modules. The
    // buffered hook registration must land on each app's OWN graph: distinct
    // graph instances, each with its own woven middleware inject edges.
    const app1 = mm.app({ baseDir: getFixtures('apps/controller-app-multi-b') });
    const app2 = mm.app({ baseDir: getFixtures('apps/controller-app-multi-c') });
    await Promise.all([app1.ready(), app2.ready()]);
    try {
      const graph1 = GlobalGraph.instanceFor((app1 as any)._teggScopeBag);
      const graph2 = GlobalGraph.instanceFor((app2 as any)._teggScopeBag);
      assert(graph1);
      assert(graph2);
      assert.notStrictEqual(graph1, graph2, 'each app must have its own GlobalGraph');

      for (const graph of [graph1!, graph2!]) {
        const controllerProto = findControllerProto(graph);
        assert(controllerProto, 'controller proto should exist in each app graph');
        const countAdviceProto = findCountAdviceInject(graph, controllerProto!);
        assert(countAdviceProto, 'middleware inject edge should be woven in each app graph');
        assert.equal(countAdviceProto!.instanceModuleName, 'multi-module-common');
      }

      // The protos behind the edges are per-app instances, not shared.
      const proto1 = findCountAdviceInject(graph1!, findControllerProto(graph1!)!);
      const proto2 = findCountAdviceInject(graph2!, findControllerProto(graph2!)!);
      assert.notStrictEqual(proto1, proto2, 'advice protos must not be shared across apps');
    } finally {
      await Promise.all([app1.close(), app2.close()]);
    }
  });
});
