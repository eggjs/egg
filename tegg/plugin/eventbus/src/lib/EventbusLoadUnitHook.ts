import type { LifecycleHook } from '@eggjs/tegg-lifecycle';
import { QualifierUtil, EggQualifierAttribute, EggType } from '@eggjs/core-decorator';
import {
  EggLoadUnitType,
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  type LoadUnit,
  type LoadUnitLifecycleContext,
} from '@eggjs/tegg-metadata';
import { EventContextFactory, EventHandlerFactory, SingletonEventBus } from '@eggjs/tegg-eventbus-runtime';

const REGISTER_CLAZZ = [EventHandlerFactory, EventContextFactory, SingletonEventBus];

// EggQualifier only for egg plugin
// allow to inject logger in SingletonEventBus
QualifierUtil.addProperQualifier(SingletonEventBus, 'logger', EggQualifierAttribute, EggType.APP);

export class EventbusLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
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
