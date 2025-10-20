import type { Application } from 'egg';
import { PrototypeUtil } from '@eggjs/core-decorator';
import type { EventBus, EventWaiter } from '@eggjs/eventbus-decorator';
import { SingletonEventBus } from '@eggjs/tegg-eventbus-runtime';
import type { EggPrototype } from '@eggjs/tegg-metadata';

export default class EventBusApplicationUnittest {
  async getEventbus(this: Application): Promise<EventBus> {
    const proto = PrototypeUtil.getClazzProto(SingletonEventBus) as EggPrototype;
    const eggObject = await this.eggContainerFactory.getOrCreateEggObject(proto, proto.name);
    return eggObject.obj as EventBus;
  }

  async getEventWaiter(this: Application): Promise<EventWaiter> {
    const proto = PrototypeUtil.getClazzProto(SingletonEventBus) as EggPrototype;
    const eggObject = await this.eggContainerFactory.getOrCreateEggObject(proto, proto.name);
    return eggObject.obj as EventWaiter;
  }
}
