import { AccessLevel } from '@eggjs/tegg-types';
import type { QualifierValue, EggAbstractClazz, EggObjectFactory as IEggObjectFactory } from '@eggjs/tegg-types';
import type { EggContainerFactory } from '@eggjs/tegg-runtime';
import { PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { QualifierImplUtil } from '@eggjs/tegg-dynamic-inject';
import { EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE } from './EggObjectFactoryPrototype.js';

@SingletonProto({
  protoImplType: EGG_OBJECT_FACTORY_PROTO_IMPLE_TYPE,
  name: 'eggObjectFactory',
  accessLevel: AccessLevel.PUBLIC,
})
export class EggObjectFactory implements IEggObjectFactory {
  eggContainerFactory: typeof EggContainerFactory;

  async getEggObject<T extends object>(abstractClazz: EggAbstractClazz<T>, qualifierValue: QualifierValue) {
    const implClazz = QualifierImplUtil.getQualifierImp(abstractClazz, qualifierValue);
    if (!implClazz) {
      throw new Error(`has no impl for ${abstractClazz.name} with qualifier ${qualifierValue}`);
    }
    const protoObj: any = PrototypeUtil.getClazzProto(implClazz);
    if (!protoObj) {
      throw new Error(`can not get proto for clazz ${implClazz.name}`);
    }
    const eggObject = await this.eggContainerFactory.getOrCreateEggObject(protoObj, protoObj.name);
    return eggObject.obj as T;
  }

  async getEggObjects<T extends object>(abstractClazz: EggAbstractClazz<T>) {
    const implClazzMap = QualifierImplUtil.getQualifierImpMap(abstractClazz);
    const getEggObject = this.getEggObject.bind(this);
    const qualifierValues = Array.from(implClazzMap.keys());

    return {
      [Symbol.asyncIterator]() {
        return {
          key: 0,
          async next() {
            if (this.key === qualifierValues.length) {
              return { done: true } as IteratorResult<T>;
            }

            const value = await getEggObject(abstractClazz, qualifierValues[this.key++]);
            return { value, done: false } as IteratorResult<T>;
          },
        };
      },
    };
  }
}
