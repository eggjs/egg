import { strict as assert } from 'node:assert';

import { MCPInfoUtil } from '@eggjs/controller-decorator';
import { describe, it } from 'vitest';

describe('Graph', () => {
  // https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain/package.json#L9
  if (parseInt(process.version.slice(1, 3)) > 19) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      GraphMetaBuilder,
      GraphEdgeMetaBuilder,
      GraphNodeMetaBuilder,
      GraphToolMetaBuilder,
      GraphToolMetadata,
      GraphMetadata,
      TeggToolNode,
      BoundModelMetaBuilder,
    } = require('../');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      FooContinueEdge,
      FooGraph,
      FooNode,
      FooSaver,
      FooTool,
      BarGraph,
      BarNode,
      ToolNode,
      ToolType,
      FooChatModel,
    } = require('./fixtures/modules/langgraph/Graph');

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
  }
});
