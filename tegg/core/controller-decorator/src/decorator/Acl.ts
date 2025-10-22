import assert from 'node:assert';

import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { ControllerInfoUtil, MethodInfoUtil } from '../util/index.ts';

export function Acl(code?: string) {
  function classAcl(constructor: EggProtoImplClass) {
    ControllerInfoUtil.setControllerAcl(code, constructor);
  }

  function methodAcl(target: any, propertyKey: PropertyKey) {
    assert.equal(
      typeof propertyKey,
      'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`,
    );
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    MethodInfoUtil.setMethodAcl(code, controllerClazz, methodName);
  }

  return function (target: any, propertyKey?: PropertyKey): void {
    if (propertyKey === undefined) {
      classAcl(target);
    } else {
      methodAcl(target, propertyKey);
    }
  };
}
