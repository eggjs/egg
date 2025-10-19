import assert from 'node:assert';

import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { EventInfoUtil } from './EventInfoUtil.ts';
import type { Events } from './Event.ts';

export interface IEventContext {
  eventName: keyof Events;
}

export function EventContext() {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    assert(
      propertyKey === 'handle',
      `[eventHandler ${target.name}] expect method name be handle, but now is ${String(propertyKey)}`
    );
    assert(parameterIndex === 0, `[eventHandler ${target.name}] expect param EventContext be the first param`);
    const clazz = target.constructor as EggProtoImplClass;
    EventInfoUtil.setEventHandlerContextInject(true, clazz);
  };
}
