import { MetadataUtil } from '@eggjs/core-decorator';
import { QUALIFIER_IMPL_MAP } from '@eggjs/tegg-types';
import type { EggAbstractClazz, EggProtoImplClass, QualifierValue } from '@eggjs/tegg-types';

export class QualifierImplUtil {
  static addQualifierImpl(
    abstractClazz: EggAbstractClazz,
    qualifierValue: QualifierValue,
    implClazz: EggProtoImplClass,
    isForceReplacement?: boolean,
  ): void {
    if (QualifierImplUtil.getQualifierImp(abstractClazz, qualifierValue) && !isForceReplacement) {
      throw new Error(
        `Qualifier Error: abstractClazz ${abstractClazz.name} qualifierValue ${qualifierValue.toString()} has been implemented`,
      );
    }
    const implMap = MetadataUtil.initOwnMapMetaData(
      QUALIFIER_IMPL_MAP,
      abstractClazz as unknown as EggProtoImplClass,
      new Map(),
    );
    implMap.set(qualifierValue, implClazz);
  }

  static getQualifierImp(
    abstractClazz: EggAbstractClazz,
    qualifierValue: QualifierValue,
  ): EggProtoImplClass | undefined {
    const implMap: Map<QualifierValue, EggProtoImplClass> | undefined = MetadataUtil.getMetaData(
      QUALIFIER_IMPL_MAP,
      abstractClazz as unknown as EggProtoImplClass,
    );
    return implMap?.get(qualifierValue);
  }

  static getQualifierImpMap(abstractClazz: EggAbstractClazz): Map<QualifierValue, EggProtoImplClass> {
    const implMap: Map<QualifierValue, EggProtoImplClass> | undefined = MetadataUtil.getMetaData(
      QUALIFIER_IMPL_MAP,
      abstractClazz as unknown as EggProtoImplClass,
    );
    return implMap || new Map();
  }
}
