import { ControllerInfoUtil, MethodInfoUtil } from '@eggjs/controller-decorator';
import { InnerObjectProto } from '@eggjs/core-decorator';
import { LifecyclePostInject } from '@eggjs/lifecycle';
import type { ProtoDependencyMeta, ProtoNode } from '@eggjs/metadata';
import { ClassProtoDescriptor as ClassProtoDescriptorImpl, GlobalGraph } from '@eggjs/metadata';
import type { GraphNode } from '@eggjs/tegg-common-util';
import type { EggProtoImplClass, IAdvice } from '@eggjs/tegg-types';

@InnerObjectProto()
export class ControllerGraphHookRegistrar {
  @LifecyclePostInject()
  protected registerGraphHook(): void {
    const globalGraph = GlobalGraph.instance;
    if (!globalGraph) {
      throw new Error(
        '[controller-runtime] GlobalGraph must be created before ControllerGraphHookRegistrar is instantiated',
      );
    }
    globalGraph.registerBuildHook(middlewareGraphHook);
  }
}

export function middlewareGraphHook(globalGraph: GlobalGraph): void {
  for (const moduleNode of globalGraph.moduleGraph.nodes.values()) {
    for (const controllerProtoNode of moduleNode.val.protos) {
      const middlewareProtoNodes = findMiddlewareProtoNodes(globalGraph, controllerProtoNode);
      if (!middlewareProtoNodes) continue;
      for (const middlewareProtoNode of middlewareProtoNodes) {
        const middlewareModuleNode = globalGraph.findModuleNode(middlewareProtoNode.val.proto.instanceModuleName);
        if (!middlewareModuleNode) continue;
        globalGraph.addInject(moduleNode, controllerProtoNode, middlewareProtoNode, middlewareProtoNode.val.proto.name);
      }
    }
  }
}

function findMiddlewareProtoNodes(globalGraph: GlobalGraph, protoNode: GraphNode<ProtoNode, ProtoDependencyMeta>) {
  const proto = protoNode.val.proto;
  if (!ClassProtoDescriptorImpl.isClassProtoDescriptor(proto)) {
    return;
  }

  const middlewareClazzSet = new Set<EggProtoImplClass<IAdvice>>();

  const controllerAopMiddlewares = ControllerInfoUtil.getControllerAopMiddlewares(proto.clazz);
  if (controllerAopMiddlewares && controllerAopMiddlewares.length > 0) {
    for (const middlewareClazz of controllerAopMiddlewares) {
      middlewareClazzSet.add(middlewareClazz);
    }
  }

  const methods = MethodInfoUtil.getMethods(proto.clazz);
  for (const methodName of methods) {
    const methodAopMiddlewares = MethodInfoUtil.getMethodAopMiddlewares(proto.clazz, methodName);
    if (methodAopMiddlewares && methodAopMiddlewares.length > 0) {
      for (const middlewareClazz of methodAopMiddlewares) {
        middlewareClazzSet.add(middlewareClazz);
      }
    }
  }

  if (middlewareClazzSet.size === 0) {
    return;
  }

  const result: GraphNode<ProtoNode, ProtoDependencyMeta>[] = [];
  for (const middlewareClazz of middlewareClazzSet) {
    const middlewareProtoNode = findProtoNodeByClass(globalGraph, middlewareClazz);
    if (middlewareProtoNode) {
      result.push(middlewareProtoNode);
    }
  }

  return result.length > 0 ? result : undefined;
}

function findProtoNodeByClass(
  globalGraph: GlobalGraph,
  clazz: EggProtoImplClass,
): GraphNode<ProtoNode, ProtoDependencyMeta> | undefined {
  for (const protoNode of globalGraph.protoGraph.nodes.values()) {
    const proto = protoNode.val.proto;
    if (ClassProtoDescriptorImpl.isClassProtoDescriptor(proto) && proto.clazz === clazz) {
      return protoNode;
    }
  }
  return undefined;
}
