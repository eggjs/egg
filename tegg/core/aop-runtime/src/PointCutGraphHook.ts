import assert from 'node:assert';
import { AspectMetaBuilder, PointcutAdviceInfoUtil } from '@eggjs/aop-decorator';
import { PrototypeUtil, QualifierUtil } from '@eggjs/core-decorator';
import { GraphNode } from '@eggjs/tegg-common-util';
import { ClassProtoDescriptor, GlobalGraph, ProtoDependencyMeta, ProtoNode } from '@eggjs/tegg-metadata';

export function pointCutGraphHook(globalGraph: GlobalGraph) {
  for (const moduleNode of globalGraph.moduleGraph.nodes.values()) {
    for (const pointCuttedProtoNode of moduleNode.val.protos) {
      const pointCutAdviceProtoList = findPointCutAdvice(globalGraph, pointCuttedProtoNode);
      if (!pointCutAdviceProtoList) continue;
      for (const pointCutAdviceProto of pointCutAdviceProtoList) {
        globalGraph.addInject(
          moduleNode,
          pointCuttedProtoNode,
          pointCutAdviceProto,
          pointCutAdviceProto.val.proto.name
        );
      }
    }
  }
}

function findPointCutAdvice(globalGraph: GlobalGraph, protoNode: GraphNode<ProtoNode, ProtoDependencyMeta>) {
  const proto = protoNode.val.proto;
  if (!ClassProtoDescriptor.isClassProtoDescriptor(proto)) {
    return;
  }
  const result: Set<GraphNode<ProtoNode, ProtoDependencyMeta>> = new Set();
  const allMethods = AspectMetaBuilder.getAllMethods(proto.clazz);
  for (const method of allMethods) {
    const adviceInfoList = PointcutAdviceInfoUtil.getPointcutAdviceInfoList(proto.clazz, method);
    for (const { clazz } of adviceInfoList) {
      const property = PrototypeUtil.getProperty(clazz);
      assert(property, 'not found property');
      const injectProto = globalGraph.findDependencyProtoNode(protoNode.val.proto, {
        objName: property.name,
        refName: property.name,
        qualifiers: QualifierUtil.mergeQualifiers(property?.qualifiers ?? [], QualifierUtil.getProtoQualifiers(clazz)),
      });
      if (injectProto) {
        result.add(injectProto);
      }
    }
  }
  return Array.from(result);
}
