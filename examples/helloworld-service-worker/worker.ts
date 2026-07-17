import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ServiceWorkerApp } from '@eggjs/service-worker';
import type { FetchEvent } from '@eggjs/tegg/standalone';

const app = new ServiceWorkerApp(path.join(path.dirname(fileURLToPath(import.meta.url)), 'app'));

// Cloudflare / edge module-worker entry (`export default { fetch }`). Wrap the
// runtime's `(request, env, ctx)` into a `FetchEvent` and dispatch via the
// engine's generic `handleEvent`, threading `ctx.waitUntil` so post-response
// work survives.
export default {
  fetch(request: Request, _env: unknown, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
    const event: FetchEvent = { type: 'fetch', request, waitUntil: (promise) => ctx.waitUntil(promise) };
    return app.handleEvent<Response>(event);
  },
};
