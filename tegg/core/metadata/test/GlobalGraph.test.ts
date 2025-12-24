import assert from 'node:assert/strict';
import path from 'node:path';

import { describe, it } from '@voidzero-dev/vite-plus/test';

import { GlobalGraph } from '../src/index.js';
import { buildModuleNode } from './fixtures/LoaderUtil.js';
import { RootProto } from './fixtures/modules/app-graph-modules/root/Root.js';
import { UnusedProto } from './fixtures/modules/app-graph-modules/unused/Unused.js';
import { UsedProto } from './fixtures/modules/app-graph-modules/used/Used.js';
import { App } from './fixtures/modules/app-multi-inject-multi/app/modules/app/App.js';
import { App2 } from './fixtures/modules/app-multi-inject-multi/app/modules/app2/App.js';
import { BizManager } from './fixtures/modules/app-multi-inject-multi/app/modules/bar/BizManager.js';
import { Secret } from './fixtures/modules/app-multi-inject-multi/app/modules/foo/Secret.js';
import { TestLoader } from './fixtures/TestLoader.js';

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
