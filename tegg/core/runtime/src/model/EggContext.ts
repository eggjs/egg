import { LifecycleUtil } from '@eggjs/lifecycle';
import type { EggRuntimeContext, EggContextLifecycleContext } from '@eggjs/tegg-types';

export const EggContextLifecycleUtil: LifecycleUtil<EggContextLifecycleContext, EggRuntimeContext> =
  new LifecycleUtil();
