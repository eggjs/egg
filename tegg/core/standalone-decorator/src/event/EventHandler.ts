import { SingletonProto } from '@eggjs/core-decorator';
import { QualifierImplDecoratorUtil } from '@eggjs/dynamic-inject';
import type { EggProtoImplClass, ImplDecorator, SingletonProtoParams } from '@eggjs/tegg-types';

/**
 * Standalone event dispatch abstraction: implementations handle one event
 * type (e.g. 'fetch') and are resolved at runtime via
 * `eggObjectFactory.getEggObject(AbstractEventHandler, event.type)`.
 */
export abstract class AbstractEventHandler<E = any, R = any> {
  abstract handleEvent(event: E): Promise<R>;
}

export const EVENT_HANDLER_ATTRIBUTE = Symbol.for('EggPrototype#eventHandler');

export type EventType = Record<string, string>;

export const EventHandler: ImplDecorator<AbstractEventHandler, EventType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractEventHandler, EVENT_HANDLER_ATTRIBUTE);

export const EventHandlerProto = (type: EventType[keyof EventType], params?: SingletonProtoParams) => {
  return (clazz: EggProtoImplClass<AbstractEventHandler>) => {
    EventHandler(type)(clazz);
    SingletonProto(params)(clazz);
  };
};
