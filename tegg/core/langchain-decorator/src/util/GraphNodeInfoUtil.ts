import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import type { IGraphNodeMetadata } from '../model/GraphNodeMetadata.ts';
import { GRAPH_NODE_METADATA } from '../type/metadataKey.ts';

export class GraphNodeInfoUtil {
  static setGraphNodeMetadata(metadata: IGraphNodeMetadata, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(GRAPH_NODE_METADATA, metadata, clazz);
  }

  static getGraphNodeMetadata(clazz: EggProtoImplClass): IGraphNodeMetadata | undefined {
    return MetadataUtil.getMetaData(GRAPH_NODE_METADATA, clazz);
  }
}
