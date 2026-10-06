import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ServiceWorkerApp } from '@eggjs/service-worker';
import type { FetchEvent } from '@eggjs/tegg/standalone';

// Cloudflare module-worker entry.
const app = new ServiceWorkerApp(path.join(path.dirname(fileURLToPath(import.meta.url)), 'app'));

export default {
  fetch(request: Request, _env: unknown, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
    const event: FetchEvent = { type: 'fetch', request, waitUntil: (p) => ctx.waitUntil(p) };
    return app.handleEvent<Response>(event);
  },
};
