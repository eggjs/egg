import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ServiceWorkerApp } from '@eggjs/service-worker';
import type { FetchEvent } from '@eggjs/tegg/standalone';

// The Cloudflare Workers entry. It is a plain module — nothing here is bundle-only,
// so it also runs directly under Node (the app scans the module dir at runtime when
// no bundle manifest is present). The bundler injects the framework-scanned imports
// and the manifest ahead of this file; this file just constructs the app and picks
// the host shape (a module worker `export default { fetch }`).
const app = new ServiceWorkerApp(path.join(path.dirname(fileURLToPath(import.meta.url)), 'app'));

export default {
  fetch(request: Request, _env: unknown, ctx: { waitUntil(promise: Promise<unknown>): void }): Promise<Response> {
    const event: FetchEvent = { type: 'fetch', request, waitUntil: (p) => ctx.waitUntil(p) };
    return app.handleEvent<Response>(event);
  },
};
