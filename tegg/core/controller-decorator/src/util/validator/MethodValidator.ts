import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { ClassUtil } from '@eggjs/tegg-metadata';

import { MethodInfoUtil } from '../MethodInfoUtil.ts';
import { ControllerInfoUtil } from '../ControllerInfoUtil.ts';

export class MethodValidator {
  // should throw error
  // 1. use method middleware but not has method decorator
  // 2. use context decorator but not has method decorator
  // 3. method decorator type is not same as controller decorator type
  static validate(clazz: EggProtoImplClass, methodName: string) {
    const methodControllerType = MethodInfoUtil.getMethodControllerType(clazz, methodName);
    const methodMiddlewares = MethodInfoUtil.getMethodMiddlewares(clazz, methodName);
    const contextIndex = MethodInfoUtil.getMethodContextIndex(clazz, methodName);
    if (!methodControllerType) {
      if (methodMiddlewares.length) {
        const desc = ClassUtil.classDescription(clazz);
        throw new Error(`${desc}:${methodName} @Middleware should use with method decorator`);
      }
      if (contextIndex !== undefined) {
        const desc = ClassUtil.classDescription(clazz);
        throw new Error(`${desc}:${methodName} @Context should use with method decorator`);
      }
      return;
    }
    const controllerType = ControllerInfoUtil.getControllerType(clazz);
    if (methodControllerType !== controllerType) {
      const desc = ClassUtil.classDescription(clazz);
      throw new Error(
        `${desc}:${methodName} method decorator ${methodControllerType} can not be used with ${controllerType}`
      );
    }
  }
}
