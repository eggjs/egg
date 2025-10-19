import assert from 'node:assert';

import type { IAdvice, EggProtoImplClass, MiddlewareFunc } from '@eggjs/tegg-types';
import { isClass } from 'is-type-of';
import { AdviceInfoUtil } from '@eggjs/aop-decorator';

import { ControllerInfoUtil, MethodInfoUtil } from '../util/index.ts';

const MiddlewareType = {
  AOP: 'AOP',
  MiddlewareFunc: 'MiddlewareFunc',
} as const;
type MiddlewareType = (typeof MiddlewareType)[keyof typeof MiddlewareType];

function isAop(mw: MiddlewareFunc | EggProtoImplClass<IAdvice>) {
  return isClass(mw) && AdviceInfoUtil.isAdvice(mw as EggProtoImplClass<IAdvice>);
}

function isAopTypeOrMiddlewareType(
  middlewares: Array<MiddlewareFunc> | Array<EggProtoImplClass<IAdvice>>
): MiddlewareType {
  const adviceCount = middlewares.filter(t => isAop(t)).length;
  if (adviceCount) {
    if (adviceCount === middlewares.length) {
      return MiddlewareType.AOP;
    }
    throw new Error('AOP and MiddlewareFunc can not be mixed');
  }
  return MiddlewareType.MiddlewareFunc;
}

export function Middleware(...middlewares: Array<MiddlewareFunc> | Array<EggProtoImplClass<IAdvice>>) {
  function functionTypeClassMiddleware(constructor: EggProtoImplClass) {
    middlewares.forEach(mid => {
      ControllerInfoUtil.addControllerMiddleware(mid as MiddlewareFunc, constructor);
    });
  }

  function aopTypeClassMiddleware(constructor: EggProtoImplClass) {
    for (const aopAdvice of middlewares as EggProtoImplClass<IAdvice>[]) {
      ControllerInfoUtil.addControllerAopMiddleware(aopAdvice, constructor);
    }
  }

  function functionTypeMethodMiddleware(target: any, propertyKey: PropertyKey) {
    assert.equal(
      typeof propertyKey,
      'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`
    );
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    middlewares.forEach(mid => {
      MethodInfoUtil.addMethodMiddleware(mid as MiddlewareFunc, controllerClazz, methodName);
    });
  }

  function aopTypeMethodMiddleware(target: any, propertyKey: PropertyKey) {
    const controllerClazz = target.constructor as EggProtoImplClass;
    const methodName = propertyKey as string;
    for (const aopAdvice of middlewares as EggProtoImplClass<IAdvice>[]) {
      MethodInfoUtil.addMethodAopMiddleware(aopAdvice, controllerClazz, methodName);
    }
  }

  return function (target: any, propertyKey?: PropertyKey): void {
    const type = isAopTypeOrMiddlewareType(middlewares);
    if (propertyKey === undefined) {
      if (type === MiddlewareType.AOP) {
        aopTypeClassMiddleware(target);
      } else {
        functionTypeClassMiddleware(target);
      }
    } else {
      if (type === MiddlewareType.AOP) {
        aopTypeMethodMiddleware(target, propertyKey);
      } else {
        functionTypeMethodMiddleware(target, propertyKey);
      }
    }
  };
}
