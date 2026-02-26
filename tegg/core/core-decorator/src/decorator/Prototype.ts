import { NameUtil, StackUtil } from '@eggjs/tegg-common-util';
import { AccessLevel, DEFAULT_PROTO_IMPL_TYPE, ObjectInitType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, EggPrototypeInfo, PrototypeParams } from '@eggjs/tegg-types';

import { PrototypeUtil } from '../util/index.ts';

const DEFAULT_PARAMS = {
  initType: ObjectInitType.SINGLETON,
  accessLevel: AccessLevel.PRIVATE,
  protoImplType: DEFAULT_PROTO_IMPL_TYPE,
};

export type PrototypeDecorator = (clazz: EggProtoImplClass) => void;

/**
 * Prototype decorator Factory
 * @param param - Prototype parameters
 * @returns Prototype decorator
 */
export function Prototype(param?: PrototypeParams): PrototypeDecorator {
  return function (clazz: EggProtoImplClass): void {
    PrototypeUtil.setIsEggPrototype(clazz);
    const property: Partial<EggPrototypeInfo> = {
      ...DEFAULT_PARAMS,
      ...param,
      className: NameUtil.cleanName(clazz.name),
    };
    if (!property.name) {
      property.name = NameUtil.getClassName(clazz);
    }
    PrototypeUtil.setProperty(clazz, property as EggPrototypeInfo);

    // './tegg/core/common-util/src/StackUtil.ts',
    // './tegg/core/core-decorator/src/decorator/Prototype.ts',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/node_modules/_reflect-metadata@0.1.13@reflect-metadata/Reflect.js',
    // './tegg/core/core-decorator/test/fixtures/decators/CacheService.ts',
    PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(false, 4));
  };
}
