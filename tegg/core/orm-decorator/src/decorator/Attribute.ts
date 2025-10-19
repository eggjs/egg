import assert from 'node:assert';

import type { AttributeOptions, EggProtoImplClass } from '@eggjs/tegg-types';

import { ModelInfoUtil } from '../util/index.ts';

export function Attribute(dataType: string, options?: AttributeOptions) {
  return function (target: any, propertyKey: PropertyKey): void {
    const clazz = target.constructor as EggProtoImplClass;
    assert(
      typeof propertyKey === 'string',
      `[model/${clazz.name}] expect method name be typeof string, but now is ${String(propertyKey)}`
    );
    ModelInfoUtil.addModelAttribute(dataType, options, clazz, propertyKey);
  };
}
