import { defineScopedLifecycleUtil } from '@eggjs/lifecycle';
import type { EggRuntimeContext, EggContextLifecycleContext } from '@eggjs/tegg-types';

export const [EggContextLifecycleUtil, eggContextLifecycleUtilFromBag] = defineScopedLifecycleUtil<
  EggContextLifecycleContext,
  EggRuntimeContext
>(Symbol('tegg:runtime:eggContextLifecycleUtil'), 'EggContextLifecycleUtil');
