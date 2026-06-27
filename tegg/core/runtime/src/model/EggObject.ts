import { defineScopedLifecycleUtil } from '@eggjs/lifecycle';
import type { EggObject, EggObjectLifeCycleContext } from '@eggjs/tegg-types';

export const [EggObjectLifecycleUtil, eggObjectLifecycleUtilFromBag] = defineScopedLifecycleUtil<
  EggObjectLifeCycleContext,
  EggObject
>(Symbol('tegg:runtime:eggObjectLifecycleUtil'), 'EggObjectLifecycleUtil');
