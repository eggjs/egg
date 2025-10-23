import type { EggRuntimeContext, EggContextLifecycleContext } from '@eggjs/tegg-types';
import { LifecycleUtil } from '@eggjs/lifecycle';

export const EggContextLifecycleUtil: LifecycleUtil<EggContextLifecycleContext, EggRuntimeContext> =
  new LifecycleUtil();
