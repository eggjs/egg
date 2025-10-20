import { EVENT_NAME } from '@eggjs/eventbus-decorator';
import type { LifecycleHook } from '@eggjs/tegg-lifecycle';
import type { EggPrototype, EggPrototypeLifecycleContext } from '@eggjs/tegg-metadata';

import { EventHandlerProtoManager } from './EventHandlerProtoManager.ts';

export class EventbusProtoHook implements LifecycleHook<EggPrototypeLifecycleContext, EggPrototype> {
  private eventHandlerProtoManager: EventHandlerProtoManager;

  constructor(eventHandlerProtoManager: EventHandlerProtoManager) {
    this.eventHandlerProtoManager = eventHandlerProtoManager;
  }

  async postCreate(_ctx: EggPrototypeLifecycleContext, obj: EggPrototype): Promise<void> {
    const event = obj.getMetaData(EVENT_NAME);
    if (!event) {
      return;
    }
    this.eventHandlerProtoManager.addProto(obj);
  }
}
