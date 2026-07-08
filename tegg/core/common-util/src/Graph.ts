import type { GraphNodeObj } from '@eggjs/tegg-types';

// const inspect = Symbol.for('nodejs.util.inspect.custom');

export interface EdgeMeta {
  equal(meta: EdgeMeta): boolean;
  toString(): string;
}

export class GraphNode<T extends GraphNodeObj, M extends EdgeMeta = EdgeMeta> {
  val: T;
  toNodeMap: Map<string, { node: GraphNode<T, M>; meta?: M }> = new Map();
  fromNodeMap: Map<string, { node: GraphNode<T, M>; meta?: M }> = new Map();

  constructor(val: T) {
    this.val = val;
    // this[inspect] = this.toJSON;
  }

  get id(): string {
    return this.val.id;
  }

  addToVertex(node: GraphNode<T, M>, meta?: M): boolean {
    if (this.toNodeMap.has(node.id)) {
      return false;
    }
    this.toNodeMap.set(node.id, { node, meta });
    return true;
  }

  addFromVertex(node: GraphNode<T, M>, meta?: M): boolean {
    if (this.fromNodeMap.has(node.id)) {
      return false;
    }
    this.fromNodeMap.set(node.id, { node, meta });
    return true;
  }

  // [inspect](): object {
  //   return this.toJSON();
  // }

  toJSON(): object {
    return {
      val: this.val,
      toNodes: Array.from(this.toNodeMap.values()),
      fromNodes: Array.from(this.fromNodeMap.values()),
    };
  }

  toString(): string {
    return this.val.toString();
  }
}

export class GraphPath<T extends GraphNodeObj, M extends EdgeMeta = EdgeMeta> {
  nodeIdMap: Map<string, number> = new Map();
  nodes: Array<{ node: GraphNode<T, M>; meta?: M }> = [];

  pushVertex(node: GraphNode<T, M>, meta?: M): boolean {
    const val = this.nodeIdMap.get(node.id) || 0;
    this.nodeIdMap.set(node.id, val + 1);
    this.nodes.push({ node, meta });
    return val === 0;
  }

  popVertex(): void {
    const nodeHandler = this.nodes.pop();
    if (nodeHandler) {
      const val = this.nodeIdMap.get(nodeHandler.node.id)!;
      this.nodeIdMap.set(nodeHandler.node.id, val - 1);
    }
  }

  toString(): string {
    const res = this.nodes.reduce((p, c) => {
      let msg = '';
      if (c.meta) {
        msg += ` ${c.meta.toString()} -> `;
      } else if (p.length) {
        msg += ' -> ';
      }
      msg += c.node.val.toString();
      p.push(msg);
      return p;
    }, new Array<string>());
    return res.join('');
  }

  // [inspect]() {
  //   return this.toString();
  // }
}

export class Graph<T extends GraphNodeObj, M extends EdgeMeta = EdgeMeta> {
  nodes: Map<string, GraphNode<T, M>> = new Map();

  addVertex(node: GraphNode<T, M>): boolean {
    if (this.nodes.has(node.id)) {
      return false;
    }
    this.nodes.set(node.id, node);
    return true;
  }

  addEdge(from: GraphNode<T, M>, to: GraphNode<T, M>, meta?: M): boolean {
    to.addFromVertex(from, meta);
    return from.addToVertex(to, meta);
  }

  findToNode(id: string, meta: M): GraphNode<T, M> | undefined {
    const node = this.nodes.get(id);
    if (!node) return undefined;
    for (const { node: toNode, meta: edgeMeta } of node.toNodeMap.values()) {
      if (edgeMeta && meta.equal(edgeMeta)) {
        return toNode;
      }
    }
    return undefined;
  }

  appendVertexToPath(node: GraphNode<T, M>, accessPath: GraphPath<T, M>, meta?: M): boolean {
    if (!accessPath.pushVertex(node, meta)) {
      return false;
    }
    for (const toNode of node.toNodeMap.values()) {
      if (!this.appendVertexToPath(toNode.node, accessPath, toNode.meta)) {
        return false;
      }
    }
    accessPath.popVertex();
    return true;
  }

  private buildLoopPath(
    stack: Array<{ node: GraphNode<T, M>; meta?: M }>,
    node: GraphNode<T, M>,
    meta?: M,
  ): GraphPath<T, M> {
    const accessPath = new GraphPath<T, M>();
    for (const pathNode of stack) {
      accessPath.pushVertex(pathNode.node, pathNode.meta);
    }
    accessPath.pushVertex(node, meta);
    return accessPath;
  }

  private findLoopPath(
    node: GraphNode<T, M>,
    visiting: Set<string>,
    visited: Set<string>,
    stack: Array<{ node: GraphNode<T, M>; meta?: M }>,
    meta?: M,
  ): GraphPath<T, M> | undefined {
    if (visited.has(node.id)) {
      return;
    }
    if (visiting.has(node.id)) {
      return this.buildLoopPath(stack, node, meta);
    }

    visiting.add(node.id);
    stack.push({ node, meta });
    for (const toNode of node.toNodeMap.values()) {
      const loopPath = this.findLoopPath(toNode.node, visiting, visited, stack, toNode.meta);
      if (loopPath) {
        return loopPath;
      }
    }
    stack.pop();
    visiting.delete(node.id);
    visited.add(node.id);
    return;
  }

  loopPath(): GraphPath<T, M> | undefined {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const stack: Array<{ node: GraphNode<T, M>; meta?: M }> = [];
    const nodes = Array.from(this.nodes.values());
    for (const node of nodes) {
      const loopPath = this.findLoopPath(node, visiting, visited, stack);
      if (loopPath) {
        return loopPath;
      }
    }
    return;
  }

  private accessNodeWithSet(node: GraphNode<T, M>, accessed: Set<GraphNode<T, M>>, res: Array<GraphNode<T, M>>): void {
    if (accessed.has(node)) {
      return;
    }
    if (!node.toNodeMap.size) {
      accessed.add(node);
      res.push(node);
      return;
    }
    for (const toNode of node.toNodeMap.values()) {
      this.accessNodeWithSet(toNode.node, accessed, res);
    }
    accessed.add(node);
    res.push(node);
  }

  accessNode(
    node: GraphNode<T, M>,
    nodes: Array<GraphNode<T, M>>,
    accessed: boolean[],
    res: Array<GraphNode<T, M>>,
  ): void {
    const accessedSet = new Set<GraphNode<T, M>>();
    for (let i = 0; i < nodes.length; ++i) {
      if (accessed[i]) {
        accessedSet.add(nodes[i]);
      }
    }
    this.accessNodeWithSet(node, accessedSet, res);
    for (let i = 0; i < nodes.length; ++i) {
      accessed[i] = accessedSet.has(nodes[i]);
    }
  }

  // sort by direct
  // priority:
  // 1. vertex can not be access
  // 2. reverse by access direct
  //
  // notice:
  // 1. sort result is not stable
  // 2. graph with loop can not be sort
  sort(): Array<GraphNode<T, M>> {
    const res: Array<GraphNode<T, M>> = [];
    const nodes = Array.from(this.nodes.values());
    const accessed = new Set<GraphNode<T, M>>();
    for (const node of nodes) {
      this.accessNodeWithSet(node, accessed, res);
    }
    return res;
  }
}
