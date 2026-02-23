import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { GraphMetadata } from '../model/GraphMetadata.ts';
import { GraphInfoUtil } from '../util/GraphInfoUtil.ts';

export class GraphMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): GraphMetadata | undefined {
    const metadata = GraphInfoUtil.getGraphMetadata(this.clazz);
    if (metadata) {
      return new GraphMetadata(metadata);
    }
  }

  static create(clazz: EggProtoImplClass): GraphMetaBuilder {
    return new GraphMetaBuilder(clazz);
  }
}
