import { PropagationType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, TransactionalParams } from '@eggjs/tegg-types';
import { TransactionMetadataUtil } from '../util/index.js';

export function Transactional(params?: TransactionalParams) {
  const propagation = params?.propagation || PropagationType.REQUIRED;
  if (!Object.values(PropagationType).includes(propagation)) {
    throw new Error(`unknown propagation type ${propagation}`);
  }
  const datasourceName = params?.datasourceName;

  return function (target: any, propertyKey: PropertyKey) {
    const constructor: EggProtoImplClass = target.constructor;
    TransactionMetadataUtil.setIsTransactionClazz(constructor);
    TransactionMetadataUtil.addTransactionMetadata(constructor, {
      propagation,
      method: propertyKey,
      datasourceName,
    });
  };
}
