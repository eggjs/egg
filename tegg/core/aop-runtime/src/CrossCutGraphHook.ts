import { AspectMetaBuilder, type CrosscutInfo, CrosscutInfoUtil } from '@eggjs/aop-decorator';
import { ClassProtoDescriptor, GlobalGraph, ProtoDependencyMeta, ProtoNode } from '@eggjs/metadata';
import { GraphNode } from '@eggjs/tegg-common-util';

export function crossCutGraphHook(globalGraph: GlobalGraph): void {
  for (const moduleNode of globalGraph.moduleGraph.nodes.values()) {
    for (const crossCutProtoNode of moduleNode.val.protos) {
      const protoNodes = findCrossCuttedClazz(globalGraph, crossCutProtoNode);
      if (!protoNodes) continue;
      for (const crossCuttedProtoNode of protoNodes) {
        const crossCuttedModuleNode = globalGraph.findModuleNode(crossCuttedProtoNode.val.proto.instanceModuleName);
        if (!crossCuttedModuleNode) continue;
        globalGraph.addInject(
          crossCuttedModuleNode,
          crossCuttedProtoNode,
          crossCutProtoNode,
          crossCutProtoNode.val.proto.name,
        );
      }
    }
  }
}

function findCrossCuttedClazz(globalGraph: GlobalGraph, protoNode: GraphNode<ProtoNode, ProtoDependencyMeta>) {
  const proto = protoNode.val.proto;
  if (!ClassProtoDescriptor.isClassProtoDescriptor(proto)) {
    return;
  }
  if (!CrosscutInfoUtil.isCrosscutAdvice(proto.clazz)) {
    return;
  }
  const crosscutInfoList = CrosscutInfoUtil.getCrosscutInfoList(proto.clazz);
  const result: GraphNode<ProtoNode, ProtoDependencyMeta>[] = [];
  // eslint-disable-next-line no-labels
  crosscut: for (const crosscutInfo of crosscutInfoList) {
    for (const protoNode of globalGraph.protoGraph.nodes.values()) {
      if (checkClazzMatchCrossCut(protoNode, crosscutInfo)) {
        result.push(protoNode);
        // eslint-disable-next-line no-labels
        break crosscut;
      }
    }
  }
  return result;
}

function checkClazzMatchCrossCut(protoNode: GraphNode<ProtoNode>, crosscutInfo: CrosscutInfo) {
  const proto = protoNode.val.proto;
  if (!ClassProtoDescriptor.isClassProtoDescriptor(proto)) {
    return;
  }
  const allMethods = AspectMetaBuilder.getAllMethods(proto.clazz);
  for (const method of allMethods) {
    if (crosscutInfo.pointcutInfo.match(proto.clazz, method)) {
      return true;
    }
  }
  return false;
}
