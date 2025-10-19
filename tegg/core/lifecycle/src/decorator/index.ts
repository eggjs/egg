import type { EggProtoImplClass, LifecycleHookName } from '@eggjs/tegg-types';

import { LifecycleUtil } from '../LifycycleUtil.ts';

type LifecycleDecorator = () => (target: object, methodName: string) => void;

function createLifecycle(hookName: LifecycleHookName): LifecycleDecorator {
  return () => {
    return function (target: object, methodName: string): void {
      const clazz = target.constructor as EggProtoImplClass;
      LifecycleUtil.setLifecycleHook(methodName, hookName, clazz);
    };
  };
}

type LifecycleStaticDecorator = () => (target: EggProtoImplClass, methodName: string) => void;

function createStaticLifecycle(hookName: LifecycleHookName): LifecycleStaticDecorator {
  return () => {
    return function (target: EggProtoImplClass, methodName: string): void {
      if (typeof target !== 'function') {
        throw new Error(`${hookName} must be a static function`);
      }
      LifecycleUtil.setLifecycleHook(methodName, hookName, target);
    };
  };
}

export const LifecyclePostConstruct: LifecycleDecorator = createLifecycle('postConstruct');
export const LifecyclePreInject: LifecycleDecorator = createLifecycle('preInject');
export const LifecyclePostInject: LifecycleDecorator = createLifecycle('postInject');
export const LifecycleInit: LifecycleDecorator = createLifecycle('init');
export const LifecyclePreDestroy: LifecycleDecorator = createLifecycle('preDestroy');
export const LifecycleDestroy: LifecycleDecorator = createLifecycle('destroy');
export const LifecyclePreLoad: LifecycleStaticDecorator = createStaticLifecycle('preLoad');
