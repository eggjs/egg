import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { DalModuleLoadUnitHook } from './DalModuleLoadUnitHook.ts';
import { DalTableEggPrototypeHook } from './DalTableEggPrototypeHook.ts';
import { TransactionPrototypeHook } from './TransactionPrototypeHook.ts';

/**
 * The DAL module plugin: feed this list into the InnerObjectLoadUnit builder
 * instead of hand-registering each hook on the host. The hooks inject the
 * host-provided `moduleConfigs` / `runtimeConfig` / `logger` inner objects.
 */
export const DAL_INNER_OBJECT_CLAZZ_LIST: readonly EggProtoImplClass[] = [
  DalModuleLoadUnitHook,
  DalTableEggPrototypeHook,
  TransactionPrototypeHook,
];

export const DAL_INNER_OBJECT_MODULE_REFERENCE = {
  name: 'teggDal',
  path: 'tegg:dal-plugin',
};
