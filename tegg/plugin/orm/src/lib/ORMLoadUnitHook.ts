import type { LifecycleHook } from '@eggjs/lifecycle';
import {
  EggLoadUnitType,
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  type LoadUnit,
  type LoadUnitLifecycleContext,
} from '@eggjs/metadata';

import { Orm } from './SingletonORM.ts';

const REGISTER_CLAZZ = [Orm];

export class ORMLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  async postCreate(_ctx: LoadUnitLifecycleContext, loadUnit: LoadUnit): Promise<void> {
    if (loadUnit.type === EggLoadUnitType.APP) {
      for (const clazz of REGISTER_CLAZZ) {
        const protos = await EggPrototypeCreatorFactory.createProto(clazz, loadUnit);
        for (const proto of protos) {
          EggPrototypeFactory.instance.registerPrototype(proto, loadUnit);
        }
      }
    }
  }
}
