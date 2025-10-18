import type { EggRuntimeContext, EggContextLifecycleContext } from '@eggjs/tegg-types';
import { LifecycleUtil } from '@eggjs/tegg-lifecycle';

export const EggContextLifecycleUtil = new LifecycleUtil<EggContextLifecycleContext, EggRuntimeContext>();
