import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { GraphEdgeMetadata } from '../model/GraphEdgeMetadata.ts';
import { GraphEdgeInfoUtil } from '../util/GraphEdgeInfoUtil.ts';

export class GraphEdgeMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): GraphEdgeMetadata | undefined {
    const metadata = GraphEdgeInfoUtil.getGraphEdgeMetadata(this.clazz);
    if (metadata) {
      return new GraphEdgeMetadata(metadata);
    }
  }

  static create(clazz: EggProtoImplClass): GraphEdgeMetaBuilder {
    return new GraphEdgeMetaBuilder(clazz);
  }
}
