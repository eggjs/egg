import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { GraphToolMetadata } from '../model/GraphToolMetadata.ts';
import { GraphToolInfoUtil } from '../util/GraphToolInfoUtil.ts';

export class GraphToolMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): GraphToolMetadata | undefined {
    const metadata = GraphToolInfoUtil.getGraphToolMetadata(this.clazz);
    if (metadata) {
      return new GraphToolMetadata(metadata);
    }
  }

  static create(clazz: EggProtoImplClass): GraphToolMetaBuilder {
    return new GraphToolMetaBuilder(clazz);
  }
}
