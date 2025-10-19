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

  loopPath(): GraphPath<T, M> | undefined {
    const accessPath = new GraphPath<T, M>();
    const nodes = Array.from(this.nodes.values());
    for (const node of nodes) {
      if (!this.appendVertexToPath(node, accessPath)) {
        return accessPath;
      }
    }
    return;
  }

  accessNode(
    node: GraphNode<T, M>,
    nodes: Array<GraphNode<T, M>>,
    accessed: boolean[],
    res: Array<GraphNode<T, M>>
  ): void {
    const index = nodes.indexOf(node);
    if (accessed[index]) {
      return;
    }
    if (!node.toNodeMap.size) {
      accessed[nodes.indexOf(node)] = true;
      res.push(node);
      return;
    }
    for (const toNode of node.toNodeMap.values()) {
      this.accessNode(toNode.node, nodes, accessed, res);
    }
    accessed[nodes.indexOf(node)] = true;
    res.push(node);
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
    const accessed: boolean[] = [];
    for (let i = 0; i < nodes.length; ++i) {
      accessed.push(false);
    }
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      this.accessNode(node, nodes, accessed, res);
    }
    return res;
  }
}
