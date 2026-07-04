import { QualifierUtil } from '@eggjs/core-decorator';
import { FrameworkErrorFormatter } from '@eggjs/errors';
import type { Graph, GraphNode } from '@eggjs/tegg-common-util';
import {
  type EggPrototypeName,
  InitTypeQualifierAttribute,
  type InjectObjectDescriptor,
  LoadUnitNameQualifierAttribute,
  ObjectInitType,
  type ProtoDescriptor,
  type QualifierInfo,
} from '@eggjs/tegg-types';

import { MultiPrototypeFound } from '../../errors.ts';
import { type ProtoDependencyMeta, type ProtoNode } from './ProtoNode.ts';
import { type ProtoSelectorContext } from './ProtoSelector.ts';

export type ProtoGraph = Graph<ProtoNode, ProtoDependencyMeta>;
export type ProtoGraphNode = GraphNode<ProtoNode, ProtoDependencyMeta>;
/**
 * Proto nodes grouped by proto name. `selectProto` requires an exact name
 * match, so the index is a safe pre-filter that avoids scanning every node
 * for every inject object.
 */
export type ProtoNameIndex = Map<EggPrototypeName, ProtoGraphNode[]>;

export class ProtoGraphUtils {
  static buildProtoNameIndex(graph: ProtoGraph): ProtoNameIndex {
    const index: ProtoNameIndex = new Map();
    for (const node of graph.nodes.values()) {
      const name = node.val.proto.name;
      let nodes = index.get(name);
      if (!nodes) {
        nodes = [];
        index.set(name, nodes);
      }
      nodes.push(node);
    }
    return index;
  }

  static findDependencyProtoNode(
    graph: ProtoGraph,
    proto: ProtoDescriptor,
    injectObject: InjectObjectDescriptor,
    index?: ProtoNameIndex,
  ): ProtoGraphNode | undefined {
    // 1. find proto with request
    // 2. try to add Context qualifier to find
    // 3. try to add self init type qualifier to find
    const protos = ProtoGraphUtils.#findDependencyProtoWithDefaultQualifiers(graph, proto, injectObject, [], index);
    if (protos.length === 0) {
      return;
    }
    if (protos.length === 1) {
      return protos[0];
    }

    const protoWithContext = ProtoGraphUtils.#findDependencyProtoWithDefaultQualifiers(
      graph,
      proto,
      injectObject,
      [
        {
          attribute: InitTypeQualifierAttribute,
          value: ObjectInitType.CONTEXT,
        },
      ],
      index,
    );
    if (protoWithContext.length === 1) {
      return protoWithContext[0];
    }

    const protoWithSelfInitType = ProtoGraphUtils.#findDependencyProtoWithDefaultQualifiers(
      graph,
      proto,
      injectObject,
      [
        {
          attribute: InitTypeQualifierAttribute,
          value: proto.initType,
        },
      ],
      index,
    );
    if (protoWithSelfInitType.length === 1) {
      return protoWithSelfInitType[0];
    }
    const loadUnitQualifier = injectObject.qualifiers.find((t) => t.attribute === LoadUnitNameQualifierAttribute);
    if (!loadUnitQualifier) {
      return ProtoGraphUtils.findDependencyProtoNode(
        graph,
        proto,
        {
          ...injectObject,
          qualifiers: QualifierUtil.mergeQualifiers(injectObject.qualifiers, [
            {
              attribute: LoadUnitNameQualifierAttribute,
              value: proto.instanceModuleName,
            },
          ]),
        },
        index,
      );
    }
    throw FrameworkErrorFormatter.formatError(new MultiPrototypeFound(injectObject.objName, injectObject.qualifiers));
  }

  static #findDependencyProtoWithDefaultQualifiers(
    graph: ProtoGraph,
    proto: ProtoDescriptor,
    injectObject: InjectObjectDescriptor,
    qualifiers: QualifierInfo[],
    index?: ProtoNameIndex,
  ): ProtoGraphNode[] {
    const candidates: Iterable<ProtoGraphNode> = index ? (index.get(injectObject.objName) ?? []) : graph.nodes.values();
    const result: ProtoGraphNode[] = [];
    const ctx: ProtoSelectorContext = {
      name: injectObject.objName,
      qualifiers: QualifierUtil.mergeQualifiers(injectObject.qualifiers, qualifiers),
      moduleName: proto.instanceModuleName,
    };
    for (const node of candidates) {
      if (node.val.selectProto(ctx)) {
        result.push(node);
      }
    }
    return result;
  }
}
