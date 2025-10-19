import { AccessLevel, PrototypeUtil, SingletonProto } from '@eggjs/core-decorator';
import { StackUtil } from '@eggjs/tegg-common-util';

import type { EventHandler } from './EventBus.ts';
import { EventInfoUtil } from './EventInfoUtil.ts';

export interface Events {}

export function Event<E extends keyof Events>(eventName: E) {
  return function (clazz: new () => EventHandler<E>): void {
    EventInfoUtil.addEventName(eventName, clazz);
    const func = SingletonProto({
      accessLevel: AccessLevel.PUBLIC,
    });
    func(clazz);
    PrototypeUtil.setFilePath(clazz, StackUtil.getCalleeFromStack(false, 5));
  };
}
