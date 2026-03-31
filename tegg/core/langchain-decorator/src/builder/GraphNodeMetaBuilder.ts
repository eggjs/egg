import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { GraphNodeMetadata } from '../model/GraphNodeMetadata.ts';
import { GraphNodeInfoUtil } from '../util/GraphNodeInfoUtil.ts';

export class GraphNodeMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): GraphNodeMetadata | undefined {
    const metadata = GraphNodeInfoUtil.getGraphNodeMetadata(this.clazz);
    if (metadata) {
      return new GraphNodeMetadata(metadata);
    }
  }

  static create(clazz: EggProtoImplClass): GraphNodeMetaBuilder {
    return new GraphNodeMetaBuilder(clazz);
  }
}
