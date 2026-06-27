import { type EggProtoImplClass, ImplDecorator, SingletonProtoParams } from '@eggjs/tegg-types';
import { QualifierImplDecoratorUtil, SingletonProto } from '@eggjs/tegg';

export abstract class AbstractEventHandler<E = any, R = any> {
  abstract handleEvent(event: E): Promise<R>;
}

export const EVENT_HANDLER_ATTRIBUTE = Symbol('EVENT_HANDLER_ATTRIBUTE');

export type EventType = Record<string, string>;

export const EventHandler: ImplDecorator<AbstractEventHandler, EventType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractEventHandler, EVENT_HANDLER_ATTRIBUTE);

export const EventHandlerProto = (type: EventType[keyof EventType], params?: SingletonProtoParams) => {
  return (clazz: EggProtoImplClass<AbstractEventHandler>) => {
    EventHandler(type)(clazz);
    SingletonProto(params)(clazz);
  };
};

export interface FetchEventLike {
  type: string;
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
  waitUntil?(promise: Promise<unknown>): void;
}
