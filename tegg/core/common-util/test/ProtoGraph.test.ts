import assert from 'node:assert/strict';

import type { GraphNodeObj } from '@eggjs/tegg-types';
import { describe, it } from 'vite-plus/test';

import { GraphNode, Graph } from '../src/index.js';

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
  });

  describe('sort', () => {
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
  });
});
