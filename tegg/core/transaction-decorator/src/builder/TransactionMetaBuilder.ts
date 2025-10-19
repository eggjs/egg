import type { EggProtoImplClass, TransactionMetadata } from '@eggjs/tegg-types';

import { TransactionMetadataUtil } from '../util/index.ts';

export class TransactionMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): TransactionMetadata[] {
    if (!TransactionMetadataUtil.isTransactionClazz(this.clazz)) {
      return [];
    }
    return TransactionMetadataUtil.getTransactionMetadataList(this.clazz);
  }
}
