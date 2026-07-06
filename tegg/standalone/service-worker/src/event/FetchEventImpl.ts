import type { FetchEvent } from '../types.ts';

/**
 * Minimal FetchEvent implementation for hosts that drive the service worker
 * from node (the serve() bridge, tests, faas adapters).
 */
export class FetchEventImpl extends Event implements FetchEvent {
  readonly request: Request;
  readonly #waitUntilPromises: Promise<any>[] = [];
  #responsePromise?: Promise<Response>;

  constructor(request: Request) {
    super('fetch');
    this.request = request;
  }

  respondWith(r: Response | PromiseLike<Response>): void {
    this.#responsePromise = Promise.resolve(r);
  }

  waitUntil(f: Promise<any>): void {
    this.#waitUntilPromises.push(f);
  }

  get responsePromise(): Promise<Response> | undefined {
    return this.#responsePromise;
  }

  async waitUntilSettled(): Promise<void> {
    if (this.#waitUntilPromises.length === 0) {
      return;
    }
    await Promise.allSettled(this.#waitUntilPromises);
  }
}
