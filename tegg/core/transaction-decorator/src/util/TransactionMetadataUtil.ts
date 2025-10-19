import { MetadataUtil } from '@eggjs/core-decorator';
import {
  IS_TRANSACTION_CLAZZ,
  TRANSACTION_META_DATA,
  type TransactionMetadata,
  type EggProtoImplClass,
} from '@eggjs/tegg-types';

export class TransactionMetadataUtil {
  static setIsTransactionClazz(clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(IS_TRANSACTION_CLAZZ, true, clazz);
  }

  static isTransactionClazz(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(IS_TRANSACTION_CLAZZ, clazz);
  }

  static addTransactionMetadata(clazz: EggProtoImplClass, data: TransactionMetadata): void {
    const list = MetadataUtil.initOwnArrayMetaData<TransactionMetadata>(TRANSACTION_META_DATA, clazz, []);
    list.push(data);
  }

  static getTransactionMetadataList(clazz: EggProtoImplClass): TransactionMetadata[] {
    return MetadataUtil.getArrayMetaData<TransactionMetadata>(TRANSACTION_META_DATA, clazz);
  }
}
