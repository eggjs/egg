import { LifecycleUtil } from '@eggjs/lifecycle';
import type { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';

export const LoadUnitLifecycleUtil: LifecycleUtil<LoadUnitLifecycleContext, LoadUnit> = new LifecycleUtil();
