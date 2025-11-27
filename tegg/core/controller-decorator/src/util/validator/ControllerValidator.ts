import { ClassUtil } from '@eggjs/metadata';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { ControllerInfoUtil } from '../ControllerInfoUtil.ts';

export class ControllerValidator {
  // should throw error
  // 1. use controller middleware but not has controller decorator
  static validate(clazz: EggProtoImplClass): void {
    const controllerType = ControllerInfoUtil.getControllerType(clazz);
    const middlewares = ControllerInfoUtil.getControllerMiddlewares(clazz);
    if (middlewares.length && !controllerType) {
      const desc = ClassUtil.classDescription(clazz);
      throw new Error(`${desc} @Middleware should use with controller decorator`);
    }
  }
}
