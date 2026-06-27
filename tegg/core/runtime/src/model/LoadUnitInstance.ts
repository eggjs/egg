import { defineScopedLifecycleUtil } from '@eggjs/lifecycle';
import type { LoadUnitInstance, LoadUnitInstanceLifecycleContext } from '@eggjs/tegg-types';

export const [LoadUnitInstanceLifecycleUtil, loadUnitInstanceLifecycleUtilFromBag] = defineScopedLifecycleUtil<
  LoadUnitInstanceLifecycleContext,
  LoadUnitInstance
>(Symbol('tegg:runtime:loadUnitInstanceLifecycleUtil'), 'LoadUnitInstanceLifecycleUtil');
