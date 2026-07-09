import assert from 'node:assert/strict';
import path from 'node:path';

import {
  AccessLevel,
  ObjectInitType,
  type InjectObjectDescriptor,
  type ProtoDescriptor,
  type QualifierInfo,
} from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { GlobalGraph, GlobalModuleNode } from '../src/index.js';
import { buildModuleNode } from './fixtures/LoaderUtil.js';
import { RootProto } from './fixtures/modules/app-graph-modules/root/Root.js';
import { UnusedProto } from './fixtures/modules/app-graph-modules/unused/Unused.js';
import { UsedProto } from './fixtures/modules/app-graph-modules/used/Used.js';
import { App } from './fixtures/modules/app-multi-inject-multi/app/modules/app/App.js';
import { App2 } from './fixtures/modules/app-multi-inject-multi/app/modules/app2/App.js';
import { BizManager } from './fixtures/modules/app-multi-inject-multi/app/modules/bar/BizManager.js';
import { Secret } from './fixtures/modules/app-multi-inject-multi/app/modules/foo/Secret.js';
import { TestLoader } from './fixtures/TestLoader.js';

function createProtoDescriptor(options: {
  name: string;
  moduleName?: string;
  qualifiers?: QualifierInfo[];
  injectObjects?: InjectObjectDescriptor[];
}): ProtoDescriptor {
  const moduleName = options.moduleName ?? 'app';
  return {
    name: options.name,
    accessLevel: AccessLevel.PUBLIC,
    initType: ObjectInitType.SINGLETON,
    qualifiers: options.qualifiers ?? [],
    injectObjects: options.injectObjects ?? [],
    protoImplType: 'class',
    properQualifiers: {},
    defineModuleName: moduleName,
    defineUnitPath: `/fixtures/${moduleName}`,
    instanceModuleName: moduleName,
    instanceDefineUnitPath: `/fixtures/${moduleName}`,
    equal(protoDescriptor) {
      return (
        this.name === protoDescriptor.name &&
        this.instanceModuleName === protoDescriptor.instanceModuleName &&
        this.initType === protoDescriptor.initType
      );
    },
  };
}

describe('test/LoadUnit/GlobalGraph.test.ts', () => {
  it('optional module dep should work', () => {
    const graph = new GlobalGraph();
    graph.addModuleNode(
      buildModuleNode(path.join(__dirname, './fixtures/modules/app-graph-modules/root'), [RootProto], []),
    );
    graph.addModuleNode(
      buildModuleNode(path.join(__dirname, './fixtures/modules/app-graph-modules/used'), [UsedProto], [], true),
    );

    graph.addModuleNode(
      buildModuleNode(path.join(__dirname, './fixtures/modules/app-graph-modules/unused'), [UnusedProto], [], true),
    );

    graph.build();
    graph.sort();
    assert(graph.moduleConfigList.length === 2);
  });

  it('multi instance inject multi instance should work', () => {
    const graph = new GlobalGraph();
    const multiInstanceClazzList = [
      {
        clazz: BizManager,
        unitPath: path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/bar'),
        moduleName: 'bar',
      },
      {
        clazz: Secret,
        unitPath: path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/foo'),
        moduleName: 'foo',
      },
    ];
    graph.addModuleNode(
      buildModuleNode(
        path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/app'),
        [App],
        multiInstanceClazzList,
      ),
    );
    graph.addModuleNode(
      buildModuleNode(
        path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/app2'),
        [App2],
        multiInstanceClazzList,
      ),
    );
    graph.addModuleNode(
      buildModuleNode(
        path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/bar'),
        [],
        multiInstanceClazzList,
      ),
    );
    graph.addModuleNode(
      buildModuleNode(
        path.join(__dirname, './fixtures/modules/app-multi-inject-multi/app/modules/foo'),
        [],
        multiInstanceClazzList,
      ),
    );

    graph.build();
    graph.sort();
    assert.deepStrictEqual(
      graph.moduleConfigList.map((t) => t.name),
      ['app', 'app2', 'bar', 'foo'],
    );
  });

  it('should resolve dependencies from proto name candidates only', () => {
    const graph = new GlobalGraph({ strict: true });
    const injectObject: InjectObjectDescriptor = {
      refName: 'target',
      objName: 'target',
      qualifiers: [],
    };
    const consumer = createProtoDescriptor({
      name: 'consumer',
      injectObjects: [injectObject],
    });
    const target = createProtoDescriptor({ name: 'target' });
    const unrelated = createProtoDescriptor({ name: 'unrelated' });

    const moduleNode = new GlobalModuleNode({
      name: 'app',
      unitPath: '/fixtures/app',
      optional: false,
    });
    moduleNode.addProto(consumer);
    moduleNode.addProto(target);
    moduleNode.addProto(unrelated);
    graph.addModuleNode(moduleNode);

    const unrelatedNode = Array.from(graph.protoGraph.nodes.values()).find((node) => node.val.proto === unrelated);
    assert(unrelatedNode);
    unrelatedNode.val.selectProto = () => {
      throw new Error('unrelated proto should not be scanned');
    };

    graph.build();
    assert.equal(graph.findInjectProto(consumer, injectObject), target);
  });

  it('should sort extends class success', async () => {
    const graph = new GlobalGraph();
    const moduleDir = path.join(__dirname, './fixtures/modules/extends-module');
    const loader = new TestLoader(moduleDir);
    const clazzList = await loader.load();
    graph.addModuleNode(buildModuleNode(moduleDir, clazzList, []));
    graph.build();
    graph.sort();
    const moduleProtoDescriptors = graph.moduleProtoDescriptorMap.get('extendsModule');
    assert(moduleProtoDescriptors);
    assert.deepStrictEqual(
      moduleProtoDescriptors!.map((t) => t.name),
      ['logger', 'base', 'foo'],
    );
  });

  it('should sort constructor extends class success', async () => {
    const graph = new GlobalGraph();
    const moduleDir = path.join(__dirname, './fixtures/modules/extends-constructor-module');
    const loader = new TestLoader(moduleDir);
    const clazzList = await loader.load();
    graph.addModuleNode(buildModuleNode(moduleDir, clazzList, []));
    graph.build();
    graph.sort();
    const moduleProtoDescriptors = graph.moduleProtoDescriptorMap.get('extendsModule');
    assert.deepStrictEqual(
      moduleProtoDescriptors!.map((t) => t.name),
      ['logger', 'bar', 'constructorBase', 'fooConstructor', 'fooConstructorLogger'],
    );
  });
});
