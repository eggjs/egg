import type { EggProtoImplClass, LifecycleHookName } from '@eggjs/tegg-types';

import { LifecycleUtil } from '../LifycycleUtil.ts';

function createLifecycle(hookName: LifecycleHookName) {
  return () => {
    return function (target: object, methodName: string) {
      const clazz = target.constructor as EggProtoImplClass;
      LifecycleUtil.setLifecycleHook(methodName, hookName, clazz);
    };
  };
}

function createStaticLifecycle(hookName: LifecycleHookName) {
  return () => {
    return function (target: EggProtoImplClass, methodName: string) {
      if (typeof target !== 'function') {
        throw new Error(`${hookName} must be a static function`);
      }
      LifecycleUtil.setLifecycleHook(methodName, hookName, target);
    };
  };
}

export const LifecyclePostConstruct = createLifecycle('postConstruct');
export const LifecyclePreInject = createLifecycle('preInject');
export const LifecyclePostInject = createLifecycle('postInject');
export const LifecycleInit = createLifecycle('init');
export const LifecyclePreDestroy = createLifecycle('preDestroy');
export const LifecycleDestroy = createLifecycle('destroy');
export const LifecyclePreLoad = createStaticLifecycle('preLoad');
