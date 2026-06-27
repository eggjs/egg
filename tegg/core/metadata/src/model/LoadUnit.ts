import { defineScopedLifecycleUtil } from '@eggjs/lifecycle';
import type { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-types';

export const [LoadUnitLifecycleUtil, loadUnitLifecycleUtilFromBag] = defineScopedLifecycleUtil<
  LoadUnitLifecycleContext,
  LoadUnit
>(Symbol('tegg:metadata:loadUnitLifecycleUtil'), 'LoadUnitLifecycleUtil');
