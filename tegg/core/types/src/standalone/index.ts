/**
 * The minimal contract the standalone engine dispatches on: every event carries
 * a `type`, resolved to an `@EventHandlerProto('<type>')` handler. Protocol
 * events narrow it and add their own payload (e.g. `FetchEvent`).
 */
export interface StandaloneEvent {
  type: string;
}

/**
 * The standalone engine's fetch event — import from `@eggjs/tegg/standalone`. A
 * native SW/edge `FetchEvent` satisfies it structurally (passes straight
 * through); the entry adapter threads `waitUntil` from the platform (native
 * `event.waitUntil` / module `ctx.waitUntil`), and the node:http bridge passes a
 * no-op (nothing to keep alive on Node).
 */
export interface FetchEvent extends StandaloneEvent {
  type: 'fetch';
  request: Request;
  waitUntil: (f: Promise<any>) => void;
}
