import type { LoadUnitInstance, LoadUnitInstanceLifecycleContext } from '@eggjs/tegg-types';
import { LifecycleUtil } from '@eggjs/lifecycle';

export const LoadUnitInstanceLifecycleUtil: LifecycleUtil<LoadUnitInstanceLifecycleContext, LoadUnitInstance> =
  new LifecycleUtil();
