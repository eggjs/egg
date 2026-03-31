import { AbstractStateGraph } from '@eggjs/langchain-decorator';
import { ClassProtoDescriptor, GlobalGraph } from '@eggjs/metadata';

import { LangGraphTracer } from '../tracing/LangGraphTracer.ts';

export function GraphBuildHook(globalGraph: GlobalGraph): void {
  let langchainGraphTracerProtoNode;
  for (const moduleNode of globalGraph.moduleGraph.nodes.values()) {
    for (const protoNode of moduleNode.val.protos) {
      if (
        (protoNode.val.proto as ClassProtoDescriptor)?.clazz &&
        (LangGraphTracer.isPrototypeOf((protoNode.val.proto as ClassProtoDescriptor).clazz) ||
          (protoNode.val.proto as ClassProtoDescriptor).clazz === LangGraphTracer)
      ) {
        langchainGraphTracerProtoNode = protoNode;
      }
    }
  }

  for (const moduleNode of globalGraph.moduleGraph.nodes.values()) {
    for (const protoNode of moduleNode.val.protos) {
      if (
        (protoNode.val.proto as ClassProtoDescriptor)?.clazz &&
        AbstractStateGraph.isPrototypeOf((protoNode.val.proto as ClassProtoDescriptor).clazz)
      ) {
        globalGraph.addInject(
          moduleNode,
          protoNode,
          langchainGraphTracerProtoNode!,
          langchainGraphTracerProtoNode!.val.proto.name,
        );
      }
    }
  }
}
