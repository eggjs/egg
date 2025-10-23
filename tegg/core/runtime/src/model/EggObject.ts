import { LifecycleUtil } from '@eggjs/lifecycle';
import type { EggObject, EggObjectLifeCycleContext } from '@eggjs/tegg-types';

export const EggObjectLifecycleUtil: LifecycleUtil<EggObjectLifeCycleContext, EggObject> = new LifecycleUtil();
