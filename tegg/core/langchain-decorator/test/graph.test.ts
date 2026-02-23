import { strict as assert } from 'node:assert';

import { MCPInfoUtil } from '@eggjs/controller-decorator';
import { describe, it, beforeAll } from 'vitest';

describe('Graph', () => {
  let GraphMetaBuilder: any;
  let GraphEdgeMetaBuilder: any;
  let GraphNodeMetaBuilder: any;
  let GraphToolMetaBuilder: any;
  let GraphToolMetadata: any;
  let GraphMetadata: any;
  let TeggToolNode: any;
  let BoundModelMetaBuilder: any;
  let FooContinueEdge: any;
  let FooGraph: any;
  let FooNode: any;
  let FooSaver: any;
  let FooTool: any;
  let BarGraph: any;
  let BarNode: any;
  let ToolNode: any;
  let ToolType: any;
  let FooChatModel: any;

  beforeAll(async () => {
    const mod = await import('../src/index.ts');
    GraphMetaBuilder = mod.GraphMetaBuilder;
    GraphEdgeMetaBuilder = mod.GraphEdgeMetaBuilder;
    GraphNodeMetaBuilder = mod.GraphNodeMetaBuilder;
    GraphToolMetaBuilder = mod.GraphToolMetaBuilder;
    GraphToolMetadata = mod.GraphToolMetadata;
    GraphMetadata = mod.GraphMetadata;
    TeggToolNode = mod.TeggToolNode;
    BoundModelMetaBuilder = mod.BoundModelMetaBuilder;

    const fixtures = await import('./fixtures/modules/langgraph/Graph.ts');
    FooContinueEdge = fixtures.FooContinueEdge;
    FooGraph = fixtures.FooGraph;
    FooNode = fixtures.FooNode;
    FooSaver = fixtures.FooSaver;
    FooTool = fixtures.FooTool;
    BarGraph = fixtures.BarGraph;
    BarNode = fixtures.BarNode;
    ToolNode = fixtures.ToolNode;
    ToolType = fixtures.ToolType;
    FooChatModel = fixtures.FooChatModel;
  });

  it('graph should work', () => {
    const meta = new GraphMetaBuilder(FooGraph).build();
    assert.deepEqual(meta?.checkpoint, FooSaver);
    assert.deepEqual(meta?.nodes, [FooNode]);
    assert.deepEqual(meta?.edges, [FooContinueEdge]);
  });

  it('edge should work', () => {
    const meta = new GraphEdgeMetaBuilder(FooContinueEdge).build();
    assert.deepEqual(meta?.fromNodeName, 'action');
    assert.deepEqual(meta?.toNodeNames, ['__end__', 'action']);
  });

  it('node should work', () => {
    const meta = new GraphNodeMetaBuilder(FooNode).build();
    assert.deepEqual(meta?.nodeName, 'action');
    assert.deepEqual(meta?.tools, [FooTool]);
    assert.deepEqual(meta?.mcpServers, ['fooMcpServer']);
  });

  it('bound model should work', () => {
    const meta = new BoundModelMetaBuilder(FooChatModel).build();
    assert.deepEqual(meta?.modelName, 'chat');
    assert.deepEqual(meta?.tools, [FooTool]);
    assert.deepEqual(meta?.mcpServers, ['fooMcpServer']);
  });

  it('tool should work', () => {
    const meta = new GraphToolMetaBuilder(FooTool).build();
    assert.deepEqual(meta instanceof GraphToolMetadata, true);
    const MCPToolParams = MCPInfoUtil.getMCPToolArgsIndex(FooTool, 'execute');
    assert.equal(MCPToolParams?.argsSchema, ToolType);
  });

  it('node build should work', () => {
    const meta = new GraphNodeMetaBuilder(BarNode).build();
    assert.deepEqual(meta?.nodeName, 'action');
  });

  it('graph build should work', () => {
    const meta = new GraphMetaBuilder(BarGraph).build();
    assert.deepEqual(meta instanceof GraphMetadata, true);
  });

  it('tool node should extend TeggToolNode', () => {
    assert.equal(TeggToolNode.prototype.isPrototypeOf(ToolNode.prototype), true);
  });
});
