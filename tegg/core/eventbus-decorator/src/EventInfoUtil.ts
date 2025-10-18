import { MetadataUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import type { EventName } from './EventBus.ts';

export const EVENT_NAME = Symbol.for('EggPrototype#eventName');
export const EVENT_CONTEXT_INJECT = Symbol.for('EggPrototype#event#handler#context#inject');

export class EventInfoUtil {
  /**
   * @deprecated
   */
  static setEventName(eventName: EventName, clazz: EggProtoImplClass) {
    EventInfoUtil.addEventName(eventName, clazz);
  }

  static addEventName(eventName: EventName, clazz: EggProtoImplClass) {
    const eventNameList = MetadataUtil.initOwnArrayMetaData<EventName>(EVENT_NAME, clazz, []);
    eventNameList.push(eventName);
  }

  static getEventNameList(clazz: EggProtoImplClass): EventName[] {
    return MetadataUtil.getArrayMetaData(EVENT_NAME, clazz);
  }

  /**
   * @deprecated
   * return the last eventName which is subscribed firstly by Event decorator
   */
  static getEventName(clazz: EggProtoImplClass): EventName | undefined {
    const eventNameList = MetadataUtil.initOwnArrayMetaData<EventName>(EVENT_NAME, clazz, []);
    if (eventNameList.length !== 0) {
      return eventNameList[eventNameList.length - 1];
    }
    return undefined;
  }

  static setEventHandlerContextInject(enable: boolean, clazz: EggProtoImplClass): void {
    MetadataUtil.defineMetaData(EVENT_CONTEXT_INJECT, enable, clazz);
  }

  static getEventHandlerContextInject(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getMetaData(EVENT_CONTEXT_INJECT, clazz) ?? false;
  }
}
