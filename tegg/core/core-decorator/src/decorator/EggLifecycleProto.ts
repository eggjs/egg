import assert from 'node:assert';

import type { CommonEggLifecycleProtoParams, EggLifecycleProtoParams, EggProtoImplClass } from '@eggjs/tegg-types';

import { PrototypeUtil } from '../util/PrototypeUtil.ts';
import { InnerObjectProto } from './InnerObjectProto.ts';
import type { PrototypeDecorator } from './Prototype.ts';

export function EggLifecycleProto(params: CommonEggLifecycleProtoParams): PrototypeDecorator {
  return function (clazz: EggProtoImplClass) {
    const { type, ...protoParams } = params || {};
    assert(type, 'EggLifecycle decorator should have type property');

    InnerObjectProto(protoParams)(clazz);

    PrototypeUtil.setIsEggLifecyclePrototype(clazz);
    PrototypeUtil.setEggLifecyclePrototypeMetadata(clazz, { type });
  };
}

type EggLifecycleProtoDecoratorFactory = (params?: EggLifecycleProtoParams) => PrototypeDecorator;

const createLifecycleProto = (type: CommonEggLifecycleProtoParams['type']): EggLifecycleProtoDecoratorFactory => {
  return (params?: EggLifecycleProtoParams) => EggLifecycleProto({ type, ...params });
};

export const LoadUnitLifecycleProto: EggLifecycleProtoDecoratorFactory = createLifecycleProto('LoadUnit');
export const LoadUnitInstanceLifecycleProto: EggLifecycleProtoDecoratorFactory =
  createLifecycleProto('LoadUnitInstance');
export const EggObjectLifecycleProto: EggLifecycleProtoDecoratorFactory = createLifecycleProto('EggObject');
export const EggPrototypeLifecycleProto: EggLifecycleProtoDecoratorFactory = createLifecycleProto('EggPrototype');
export const EggContextLifecycleProto: EggLifecycleProtoDecoratorFactory = createLifecycleProto('EggContext');
