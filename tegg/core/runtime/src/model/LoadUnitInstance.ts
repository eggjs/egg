import { LifecycleUtil } from '@eggjs/lifecycle';
import type { LoadUnitInstance, LoadUnitInstanceLifecycleContext } from '@eggjs/tegg-types';

export const LoadUnitInstanceLifecycleUtil: LifecycleUtil<LoadUnitInstanceLifecycleContext, LoadUnitInstance> =
  new LifecycleUtil();
