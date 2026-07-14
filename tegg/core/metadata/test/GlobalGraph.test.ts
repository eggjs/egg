import assert from 'node:assert/strict';
import path from 'node:path';

import {
  AccessLevel,
  InitTypeQualifierAttribute,
  LoadUnitNameQualifierAttribute,
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
  override?: boolean;
  conditionalOnMissing?: boolean;
  accessLevel?: AccessLevel;
  initType?: ObjectInitType;
}): ProtoDescriptor {
  const moduleName = options.moduleName ?? 'app';
  return {
    name: options.name,
    accessLevel: options.accessLevel ?? AccessLevel.PUBLIC,
    initType: options.initType ?? ObjectInitType.SINGLETON,
    qualifiers: options.qualifiers ?? [],
    injectObjects: options.injectObjects ?? [],
    protoImplType: 'class',
    properQualifiers: {},
    override: options.override,
    conditionalOnMissing: options.conditionalOnMissing,
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

  it('should reject late build hooks and repeated builds', () => {
    const graph = new GlobalGraph();
    let hookCalls = 0;
    graph.registerBuildHook(() => hookCalls++);

    graph.build();

    assert.equal(hookCalls, 1);
    assert.throws(
      () => graph.registerBuildHook(() => {}),
      /cannot register global graph build hook after build has started/,
    );
    assert.throws(() => graph.build(), /global graph can only be built once/);
  });

  it('should reject build hook registration while build hooks are running', () => {
    const graph = new GlobalGraph();
    let nestedHookCalled = false;
    graph.registerBuildHook(() => {
      graph.registerBuildHook(() => {
        nestedHookCalled = true;
      });
    });

    assert.throws(
      () => graph.build(),
      /cannot register global graph build hook after build has started \(state: building\)/,
    );
    assert.equal(nestedHookCalled, false);
    assert.throws(() => graph.build(), /global graph can only be built once \(state: built\)/);
  });

  it('should invalidate the proto name index before a partial add failure', () => {
    const graph = new GlobalGraph();
    const consumer = createProtoDescriptor({ name: 'consumer' });
    const existing = createProtoDescriptor({ name: 'existing' });
    const initialNode = new GlobalModuleNode({ name: 'initial', unitPath: '/fixtures/initial', optional: false });
    initialNode.addProto(consumer);
    initialNode.addProto(existing);
    graph.addModuleNode(initialNode);

    assert(graph.findDependencyProtoNode(consumer, { refName: 'existing', objName: 'existing', qualifiers: [] }));

    const addedBeforeFailure = createProtoDescriptor({ name: 'addedBeforeFailure', moduleName: 'partial' });
    const duplicate = createProtoDescriptor({ name: 'existing', moduleName: 'partial' });
    duplicate.instanceModuleName = existing.instanceModuleName;
    duplicate.instanceDefineUnitPath = existing.instanceDefineUnitPath;
    const partialNode = new GlobalModuleNode({ name: 'partial', unitPath: '/fixtures/partial', optional: false });
    partialNode.addProto(addedBeforeFailure);
    partialNode.addProto(duplicate);

    assert.throws(() => graph.addModuleNode(partialNode), /duplicate proto/);
    assert(
      graph.findDependencyProtoNode(consumer, {
        refName: 'addedBeforeFailure',
        objName: 'addedBeforeFailure',
        qualifiers: [],
      }),
    );
  });

  describe('@Override / @ConditionalOnMissing precedence', () => {
    // Same-name protos must live in different modules to coexist (identical
    // identity would throw `duplicate proto`), mirroring framework-default vs
    // app-override.
    function buildWith(targets: ProtoDescriptor[]) {
      const injectObject: InjectObjectDescriptor = { refName: 'target', objName: 'target', qualifiers: [] };
      const consumer = createProtoDescriptor({
        name: 'consumer',
        moduleName: 'consumerMod',
        injectObjects: [injectObject],
      });
      const graph = new GlobalGraph({ strict: true });
      const consumerModule = new GlobalModuleNode({
        name: 'consumerMod',
        unitPath: '/fixtures/consumerMod',
        optional: false,
      });
      consumerModule.addProto(consumer);
      graph.addModuleNode(consumerModule);
      for (const target of targets) {
        const moduleNode = new GlobalModuleNode({
          name: target.instanceModuleName,
          unitPath: `/fixtures/${target.instanceModuleName}`,
          optional: false,
        });
        moduleNode.addProto(target);
        graph.addModuleNode(moduleNode);
      }
      graph.build();
      return { graph, consumer, injectObject };
    }

    function isInProtoGraph(graph: GlobalGraph, proto: ProtoDescriptor): boolean {
      return Array.from(graph.protoGraph.nodes.values()).some((node) => node.val.proto === proto);
    }

    it('a plain proto overrides a same-name @ConditionalOnMissing default', () => {
      const conditional = createProtoDescriptor({ name: 'target', moduleName: 'fw', conditionalOnMissing: true });
      const plain = createProtoDescriptor({ name: 'target', moduleName: 'app' });
      const { graph, consumer, injectObject } = buildWith([conditional, plain]);
      assert.equal(graph.findInjectProto(consumer, injectObject), plain);
      assert.equal(isInProtoGraph(graph, conditional), false);
    });

    it('an @Override proto overrides a same-name plain proto', () => {
      const plain = createProtoDescriptor({ name: 'target', moduleName: 'fw' });
      const override = createProtoDescriptor({ name: 'target', moduleName: 'app', override: true });
      const { graph, consumer, injectObject } = buildWith([plain, override]);
      assert.equal(graph.findInjectProto(consumer, injectObject), override);
      assert.equal(isInProtoGraph(graph, plain), false);
    });

    it('an @Override proto overrides a same-name @ConditionalOnMissing default', () => {
      const conditional = createProtoDescriptor({ name: 'target', moduleName: 'fw', conditionalOnMissing: true });
      const override = createProtoDescriptor({ name: 'target', moduleName: 'app', override: true });
      const { graph, consumer, injectObject } = buildWith([conditional, override]);
      assert.equal(graph.findInjectProto(consumer, injectObject), override);
      assert.equal(isInProtoGraph(graph, conditional), false);
    });

    it('a sole @ConditionalOnMissing default is used when nothing else provides the name', () => {
      const conditional = createProtoDescriptor({ name: 'target', moduleName: 'fw', conditionalOnMissing: true });
      const { graph, consumer, injectObject } = buildWith([conditional]);
      assert.equal(graph.findInjectProto(consumer, injectObject), conditional);
      assert.equal(isInProtoGraph(graph, conditional), true);
    });

    it('a pruned loser is never instantiated (absent from the sorted module protos)', () => {
      const conditional = createProtoDescriptor({ name: 'target', moduleName: 'fw', conditionalOnMissing: true });
      const plain = createProtoDescriptor({ name: 'target', moduleName: 'app' });
      const { graph } = buildWith([conditional, plain]);
      graph.sort();
      assert.equal(graph.moduleProtoDescriptorMap.get('fw'), undefined);
      const appProtos = graph.moduleProtoDescriptorMap.get('app');
      assert(appProtos);
      assert.equal(
        appProtos!.some((proto) => proto === plain),
        true,
      );
    });
  });

  describe('@Override / @ConditionalOnMissing only prunes genuine competitors', () => {
    function build(protos: ProtoDescriptor[]) {
      const graph = new GlobalGraph({ strict: true });
      for (const proto of protos) {
        const moduleNode = new GlobalModuleNode({
          name: proto.instanceModuleName,
          unitPath: `/fixtures/${proto.instanceModuleName}`,
          optional: false,
        });
        moduleNode.addProto(proto);
        graph.addModuleNode(moduleNode);
      }
      graph.build();
      return graph;
    }
    function inGraph(graph: GlobalGraph, proto: ProtoDescriptor): boolean {
      return Array.from(graph.protoGraph.nodes.values()).some((node) => node.val.proto === proto);
    }

    it('does not prune across different user qualifiers (they target different injections)', () => {
      const qA: QualifierInfo[] = [{ attribute: Symbol.for('k'), value: 'A' }];
      const qB: QualifierInfo[] = [{ attribute: Symbol.for('k'), value: 'B' }];
      const conditional = createProtoDescriptor({
        name: 'foo',
        moduleName: 'fw',
        qualifiers: qA,
        conditionalOnMissing: true,
      });
      const plain = createProtoDescriptor({ name: 'foo', moduleName: 'app', qualifiers: qB });
      const graph = build([conditional, plain]);
      assert.equal(inGraph(graph, conditional), true);
      assert.equal(inGraph(graph, plain), true);
    });

    it('does not prune across different init types', () => {
      const conditional = createProtoDescriptor({
        name: 'foo',
        moduleName: 'fw',
        initType: ObjectInitType.SINGLETON,
        conditionalOnMissing: true,
      });
      const plain = createProtoDescriptor({ name: 'foo', moduleName: 'app', initType: ObjectInitType.CONTEXT });
      const graph = build([conditional, plain]);
      assert.equal(inGraph(graph, conditional), true);
      assert.equal(inGraph(graph, plain), true);
    });

    it('does not prune two PRIVATE same-name protos in different modules (module-local, no competition)', () => {
      const a = createProtoDescriptor({
        name: 'foo',
        moduleName: 'fw',
        accessLevel: AccessLevel.PRIVATE,
        conditionalOnMissing: true,
      });
      const b = createProtoDescriptor({ name: 'foo', moduleName: 'app', accessLevel: AccessLevel.PRIVATE });
      const graph = build([a, b]);
      assert.equal(inGraph(graph, a), true);
      assert.equal(inGraph(graph, b), true);
    });

    it('still overrides across modules even with the auto-added LoadUnitName/InitType qualifiers present', () => {
      // Real protos carry LoadUnitName (module) + InitType qualifiers; the
      // compete key must ignore those so a cross-module override still groups.
      const conditional = createProtoDescriptor({
        name: 'foo',
        moduleName: 'fw',
        conditionalOnMissing: true,
        qualifiers: [
          { attribute: InitTypeQualifierAttribute, value: ObjectInitType.SINGLETON },
          { attribute: LoadUnitNameQualifierAttribute, value: 'fw' },
        ],
      });
      const override = createProtoDescriptor({
        name: 'foo',
        moduleName: 'app',
        override: true,
        qualifiers: [
          { attribute: InitTypeQualifierAttribute, value: ObjectInitType.SINGLETON },
          { attribute: LoadUnitNameQualifierAttribute, value: 'app' },
        ],
      });
      const graph = build([conditional, override]);
      assert.equal(inGraph(graph, override), true);
      assert.equal(inGraph(graph, conditional), false);
    });
  });
});
