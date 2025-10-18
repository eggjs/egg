import { Application } from 'egg';
import { PrototypeUtil, type EventBus, type EventWaiter } from '@eggjs/tegg';
import { SingletonEventBus } from '@eggjs/tegg-eventbus-runtime';
import { type EggPrototype } from '@eggjs/tegg-metadata';

export default class EventBusApplicationUnittest extends Application {
  async getEventbus(): Promise<EventBus> {
    const proto = PrototypeUtil.getClazzProto(SingletonEventBus) as EggPrototype;
    const eggObject = await this.eggContainerFactory.getOrCreateEggObject(proto, proto.name);
    return eggObject.obj as EventBus;
  }

  async getEventWaiter(): Promise<EventWaiter> {
    const proto = PrototypeUtil.getClazzProto(SingletonEventBus) as EggPrototype;
    const eggObject = await this.eggContainerFactory.getOrCreateEggObject(proto, proto.name);
    return eggObject.obj as EventWaiter;
  }
}

declare module 'egg' {
  interface Application {
    /**
     * Get the event bus, only for unittest
     */
    getEventbus(): Promise<EventBus>;
    /**
     * Get the event waiter, only for unittest
     */
    getEventWaiter(): Promise<EventWaiter>;
  }
}
