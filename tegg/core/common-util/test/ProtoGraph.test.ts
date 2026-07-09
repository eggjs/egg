import assert from 'node:assert/strict';

import type { GraphNodeObj } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { GraphNode, Graph, GraphPath, type EdgeMeta } from '../src/index.js';

describe('test/LoadUnit/Graph.test.ts', () => {
  class GraphNodeVal implements GraphNodeObj {
    id: string;

    constructor(id: string) {
      this.id = id;
    }

    toString() {
      return `id:${this.id}`;
    }
  }

  class GraphEdgeMeta implements EdgeMeta {
    label: string;

    constructor(label: string) {
      this.label = label;
    }

    equal(meta: EdgeMeta): boolean {
      return meta instanceof GraphEdgeMeta && meta.label === this.label;
    }

    toString() {
      return `edge:${this.label}`;
    }
  }

  function createMetaNode(id: string): GraphNode<GraphNodeVal, GraphEdgeMeta> {
    return new GraphNode<GraphNodeVal, GraphEdgeMeta>(new GraphNodeVal(id));
  }

  describe('node and edge helpers', () => {
    it('should reject duplicate vertices and edges', () => {
      const graph = new Graph<GraphNodeVal, GraphEdgeMeta>();
      const node1 = createMetaNode('1');
      const node2 = createMetaNode('2');
      const meta = new GraphEdgeMeta('1-2');

      assert.equal(graph.addVertex(node1), true);
      assert.equal(graph.addVertex(node1), false);
      assert.equal(graph.addVertex(node2), true);
      assert.equal(graph.addEdge(node1, node2, meta), true);
      assert.equal(graph.addEdge(node1, node2, meta), false);

      assert.deepStrictEqual(node1.toJSON(), {
        val: node1.val,
        toNodes: [{ node: node2, meta }],
        fromNodes: [],
      });
      assert.deepStrictEqual(node2.toJSON(), {
        val: node2.val,
        toNodes: [],
        fromNodes: [{ node: node1, meta }],
      });
    });

    it('should find connected nodes by edge meta', () => {
      const graph = new Graph<GraphNodeVal, GraphEdgeMeta>();
      const node1 = createMetaNode('1');
      const node2 = createMetaNode('2');
      const node3 = createMetaNode('3');
      graph.addVertex(node1);
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addEdge(node1, node2, new GraphEdgeMeta('match'));
      graph.addEdge(node1, node3);

      assert.equal(graph.findToNode('missing', new GraphEdgeMeta('match')), undefined);
      assert.equal(graph.findToNode(node1.id, new GraphEdgeMeta('match')), node2);
      assert.equal(graph.findToNode(node1.id, new GraphEdgeMeta('other')), undefined);
    });

    it('should format graph paths with edge meta', () => {
      const path = new GraphPath<GraphNodeVal, GraphEdgeMeta>();
      const node1 = createMetaNode('1');
      const node2 = createMetaNode('2');

      path.popVertex();
      assert.equal(path.pushVertex(node1), true);
      assert.equal(path.pushVertex(node2, new GraphEdgeMeta('1-2')), true);
      assert.equal(path.toString(), 'id:1 edge:1-2 -> id:2');
    });
  });

  describe('hasLoop', () => {
    it('if has loop, should return path', () => {
      const graph = new Graph();
      const node1 = new GraphNode(new GraphNodeVal('1'));
      const node2 = new GraphNode(new GraphNodeVal('2'));
      const node3 = new GraphNode(new GraphNodeVal('3'));
      const node4 = new GraphNode(new GraphNodeVal('4'));
      const node5 = new GraphNode(new GraphNodeVal('5'));
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addVertex(node1);
      graph.addVertex(node4);
      graph.addVertex(node5);

      graph.addEdge(node1, node5);
      graph.addEdge(node1, node2);
      graph.addEdge(node2, node3);
      graph.addEdge(node3, node1);

      const loopPath = graph.loopPath();
      assert(loopPath!.toString() === 'id:2 -> id:3 -> id:1 -> id:2');
    });

    it('should return the current access path when loop is reached', () => {
      const graph = new Graph();
      const node1 = new GraphNode(new GraphNodeVal('1'));
      const node2 = new GraphNode(new GraphNodeVal('2'));
      const node3 = new GraphNode(new GraphNodeVal('3'));
      graph.addVertex(node1);
      graph.addVertex(node2);
      graph.addVertex(node3);

      graph.addEdge(node1, node2);
      graph.addEdge(node2, node3);
      graph.addEdge(node3, node2);

      const loopPath = graph.loopPath();
      assert(loopPath!.toString() === 'id:1 -> id:2 -> id:3 -> id:2');
    });

    it('if do not has loop, should return undefined', () => {
      const graph = new Graph();
      const node1 = new GraphNode({ id: '1' });
      const node2 = new GraphNode({ id: '2' });
      const node3 = new GraphNode({ id: '3' });
      const node4 = new GraphNode({ id: '4' });
      const node5 = new GraphNode({ id: '5' });
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addVertex(node1);
      graph.addVertex(node4);
      graph.addVertex(node5);

      graph.addEdge(node1, node5);
      graph.addEdge(node1, node2);
      graph.addEdge(node2, node3);
      graph.addEdge(node3, node4);

      const loopPath = graph.loopPath();
      assert(!loopPath);
    });

    it('should keep legacy appendVertexToPath behavior', () => {
      const graph = new Graph<GraphNodeVal, GraphEdgeMeta>();
      const node1 = createMetaNode('1');
      const node2 = createMetaNode('2');
      const node3 = createMetaNode('3');
      graph.addVertex(node1);
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addEdge(node1, node2, new GraphEdgeMeta('1-2'));
      graph.addEdge(node2, node3, new GraphEdgeMeta('2-3'));

      const accessPath = new GraphPath<GraphNodeVal, GraphEdgeMeta>();
      assert.equal(graph.appendVertexToPath(node1, accessPath), true);
      assert.equal(accessPath.toString(), '');

      graph.addEdge(node3, node2, new GraphEdgeMeta('3-2'));
      assert.equal(graph.appendVertexToPath(node1, accessPath), false);
      assert.equal(accessPath.toString(), 'id:1 edge:1-2 -> id:2 edge:2-3 -> id:3 edge:3-2 -> id:2');
    });
  });

  describe('sort', () => {
    function buildLayeredGraph(layerSize: number, layerCount: number) {
      const graph = new Graph<GraphNodeVal>();
      const layers: GraphNode<GraphNodeVal>[][] = [];
      for (let layerIndex = 0; layerIndex < layerCount; ++layerIndex) {
        const layer: GraphNode<GraphNodeVal>[] = [];
        for (let nodeIndex = 0; nodeIndex < layerSize; ++nodeIndex) {
          const node = new GraphNode(new GraphNodeVal(`${layerIndex}-${nodeIndex}`));
          graph.addVertex(node);
          layer.push(node);
        }
        layers.push(layer);
      }
      for (let layerIndex = 0; layerIndex < layerCount - 1; ++layerIndex) {
        for (const fromNode of layers[layerIndex]) {
          for (const toNode of layers[layerIndex + 1]) {
            graph.addEdge(fromNode, toNode);
          }
        }
      }
      return { graph, layers };
    }

    it('can not access vertex should at first', () => {
      const graph = new Graph();
      const node1 = new GraphNode({ id: '1' });
      const node2 = new GraphNode({ id: '2' });
      const node3 = new GraphNode({ id: '3' });
      graph.addVertex(node1);
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addEdge(node2, node3);
      const sortRes = graph.sort();
      assert(sortRes[0] === node1);
    });

    it('should have reverse order with access direct', () => {
      const graph = new Graph();
      const node1 = new GraphNode({ id: '1' });
      const node2 = new GraphNode({ id: '2' });
      const node3 = new GraphNode({ id: '3' });
      const node4 = new GraphNode({ id: '4' });
      const node5 = new GraphNode({ id: '5' });
      graph.addVertex(node1);
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addVertex(node4);
      graph.addVertex(node5);
      graph.addEdge(node1, node2);
      graph.addEdge(node2, node5);
      graph.addEdge(node3, node4);
      graph.addEdge(node4, node5);
      const sortRes = graph.sort();
      assert.deepStrictEqual(sortRes, [node5, node2, node1, node4, node3]);
    });

    it('should fail fast when sorting circular dependencies', () => {
      const graph = new Graph();
      const node1 = new GraphNode(new GraphNodeVal('1'));
      const node2 = new GraphNode(new GraphNodeVal('2'));
      graph.addVertex(node1);
      graph.addVertex(node2);
      graph.addEdge(node1, node2);
      graph.addEdge(node2, node1);

      assert.throws(() => graph.sort(), /graph has recursive deps: id:1/);
    });

    it('should keep legacy accessNode boolean array API', () => {
      const graph = new Graph<GraphNodeVal>();
      const node1 = new GraphNode(new GraphNodeVal('1'));
      const node2 = new GraphNode(new GraphNodeVal('2'));
      const node3 = new GraphNode(new GraphNodeVal('3'));
      graph.addVertex(node1);
      graph.addVertex(node2);
      graph.addVertex(node3);
      graph.addEdge(node1, node2);
      graph.addEdge(node2, node3);
      const nodes = [node1, node2, node3];
      const accessed = [false, false, true];
      const res: GraphNode<GraphNodeVal>[] = [node3];

      graph.accessNode(node1, nodes, accessed, res);

      assert.deepStrictEqual(res, [node3, node2, node1]);
      assert.deepStrictEqual(accessed, [true, true, true]);
    });

    it('should sort shared acyclic paths once', () => {
      const layerSize = 8;
      const layerCount = 8;
      const { graph, layers } = buildLayeredGraph(layerSize, layerCount);

      assert.equal(graph.loopPath(), undefined);
      const sortRes = graph.sort();
      const sortedIndexMap = new Map(sortRes.map((node, index) => [node.id, index]));
      assert.equal(sortRes.length, layerSize * layerCount);
      assert.equal(new Set(sortRes).size, sortRes.length);
      for (let layerIndex = 0; layerIndex < layerCount - 1; ++layerIndex) {
        for (const fromNode of layers[layerIndex]) {
          for (const toNode of layers[layerIndex + 1]) {
            assert(sortedIndexMap.get(toNode.id)! < sortedIndexMap.get(fromNode.id)!);
          }
        }
      }
    });

    it('should not scan nodes with Array#indexOf when sorting shared paths', () => {
      const { graph } = buildLayeredGraph(8, 8);
      const originalIndexOf = Array.prototype.indexOf;
      let indexOfCallCount = 0;
      Array.prototype.indexOf = function indexOfSpy(
        this: unknown[],
        searchElement: unknown,
        fromIndex?: number,
      ): number {
        indexOfCallCount++;
        return originalIndexOf.call(this, searchElement, fromIndex);
      };
      try {
        graph.sort();
      } finally {
        Array.prototype.indexOf = originalIndexOf;
      }

      assert.equal(indexOfCallCount, 0);
    });
  });
});
