import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import type { IGraphMetadata } from '../model/GraphMetadata.ts';
import { GRAPH_GRAPH_METADATA } from '../type/metadataKey.ts';

export class GraphInfoUtil {
  static graphMap: Map<EggProtoImplClass, IGraphMetadata> = new Map<EggProtoImplClass, IGraphMetadata>();

  static setGraphMetadata(metadata: IGraphMetadata, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(GRAPH_GRAPH_METADATA, metadata, clazz);
    GraphInfoUtil.graphMap.set(clazz, metadata);
  }

  static getGraphMetadata(clazz: EggProtoImplClass): IGraphMetadata | undefined {
    return MetadataUtil.getMetaData(GRAPH_GRAPH_METADATA, clazz);
  }

  static getAllGraphMetadata(): Map<EggProtoImplClass, IGraphMetadata> {
    return GraphInfoUtil.graphMap;
  }
}
