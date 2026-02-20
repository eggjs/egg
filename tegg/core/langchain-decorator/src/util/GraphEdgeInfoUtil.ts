import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import type { IGraphEdgeMetadata } from '../model/GraphEdgeMetadata.ts';
import { GRAPH_EDGE_METADATA } from '../type/metadataKey.ts';

export class GraphEdgeInfoUtil {
  static setGraphEdgeMetadata(metadata: IGraphEdgeMetadata, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(GRAPH_EDGE_METADATA, metadata, clazz);
  }

  static getGraphEdgeMetadata(clazz: EggProtoImplClass): IGraphEdgeMetadata | undefined {
    return MetadataUtil.getMetaData(GRAPH_EDGE_METADATA, clazz);
  }
}
