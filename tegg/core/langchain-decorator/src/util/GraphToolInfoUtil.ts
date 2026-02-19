import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import type { IGraphToolMetadata } from '../model/GraphToolMetadata.ts';
import { GRAPH_TOOL_METADATA } from '../type/metadataKey.ts';

export class GraphToolInfoUtil {
  static graphToolMap = new Map<EggProtoImplClass, IGraphToolMetadata>();
  static setGraphToolMetadata(metadata: IGraphToolMetadata, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(GRAPH_TOOL_METADATA, metadata, clazz);
    GraphToolInfoUtil.graphToolMap.set(clazz, metadata);
  }

  static getGraphToolMetadata(clazz: EggProtoImplClass): IGraphToolMetadata | undefined {
    return MetadataUtil.getMetaData(GRAPH_TOOL_METADATA, clazz);
  }

  static getAllGraphToolMetadata(): Map<EggProtoImplClass, IGraphToolMetadata> {
    return GraphToolInfoUtil.graphToolMap;
  }
}
