import type { Events } from './Event.ts';
import type { IEventContext } from './EventContext.ts';
import type { Arguments, TypedEventEmitter } from './typed-emitter.ts';

export type EventName = string | symbol;
export type { Arguments };

/**
 * use `emit` to emit a event
 */
export interface EventBus extends Pick<TypedEventEmitter<Events>, 'emit'> {
  cork(corkId: string): void;

  /**
   * @return true if uncorked
   */
  uncork(corkId: string): boolean;
}

export const CORK_ID = Symbol.for('eventBus#corkId');

export interface ContextEventBus extends EventBus {
  cork(): void;
  uncork(): boolean;
}

export type EventKeys = keyof Events;

/**
 * use to ensure event will happen
 * Can not inject for now, only use for unittest
 */
export interface EventWaiter {
  await<E extends keyof Events>(event: E): Promise<Arguments<Events[E]>>;

  awaitFirst<E1 extends EventKeys, E2 extends EventKeys>(
    e1: E1,
    e2: E2
  ): Promise<{ event: E1 | E2; args: Arguments<Events[E1] | Events[E2]> }>;
  awaitFirst<E1 extends EventKeys, E2 extends EventKeys, E3 extends EventKeys>(
    e1: E1,
    e2: E2,
    e3: E3
  ): Promise<{ event: E1 | E2 | E3; args: Arguments<Events[E1] | Events[E2] | Events[E3]> }>;
  awaitFirst<E1 extends EventKeys, E2 extends EventKeys, E3 extends EventKeys, E4 extends EventKeys>(
    e1: E1,
    e2: E2,
    e3: E3,
    e4: E4
  ): Promise<{ event: E1 | E2 | E3 | E4; args: Arguments<Events[E1] | Events[E2] | Events[E3] | Events[E4]> }>;
}

type EventHandlerWithContext<E extends keyof Events> = {
  handle: (ctx: IEventContext, ...args: Arguments<Events[E]>) => ReturnType<Events[E]>;
};

export type EventHandler<E extends keyof Events> =
  | {
      handle: Events[E];
    }
  | EventHandlerWithContext<E>;
