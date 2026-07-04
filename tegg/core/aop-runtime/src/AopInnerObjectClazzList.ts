import { CrosscutAdviceFactory } from '@eggjs/aop-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { AopGraphHookRegistrar } from './AopGraphHookRegistrar.js';
import { EggObjectAopHook } from './EggObjectAopHook.js';
import { EggPrototypeCrossCutHook } from './EggPrototypeCrossCutHook.js';
import { LoadUnitAopHook } from './LoadUnitAopHook.js';

/**
 * The AOP module plugin: feed this list into the InnerObjectLoadUnit builder
 * (standalone: StandaloneApp built-ins; egg: aop plugin boot via
 * moduleHandler.registerInnerObjectClazzList) instead of hand-registering each
 * hook on the host.
 */
export const AOP_INNER_OBJECT_CLAZZ_LIST: readonly EggProtoImplClass[] = [
  CrosscutAdviceFactory,
  LoadUnitAopHook,
  EggPrototypeCrossCutHook,
  EggObjectAopHook,
  AopGraphHookRegistrar,
];

export const AOP_INNER_OBJECT_MODULE_REFERENCE = {
  name: 'teggAop',
  path: 'tegg:aop-runtime',
};
