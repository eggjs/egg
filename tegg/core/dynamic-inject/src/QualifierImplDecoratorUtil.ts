import { QualifierUtil } from '@eggjs/core-decorator';
import type {
  EggAbstractClazz,
  EggProtoImplClass,
  ImplDecorator,
  ImplTypeEnum,
  QualifierAttribute,
} from '@eggjs/tegg-types';

import { QualifierImplUtil } from './QualifierImplUtil.ts';

export class QualifierImplDecoratorUtil {
  static generatorDecorator<T extends object, Enum extends ImplTypeEnum>(
    abstractClazz: EggAbstractClazz<T>,
    attribute: QualifierAttribute,
  ): ImplDecorator<T, Enum> {
    return function (type: Enum[keyof Enum], isForceReplacement?: boolean) {
      return function (clazz: EggProtoImplClass<T>) {
        QualifierImplUtil.addQualifierImpl(abstractClazz, type, clazz, isForceReplacement);
        QualifierUtil.addProtoQualifier(clazz, attribute, type, isForceReplacement);
      };
    };
  }
}
