import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ServiceWorkerApp } from '@eggjs/service-worker';

// The *service-worker* format entry: instead of `export default { fetch }`, it
// registers a listener on the global `fetch` event. This targets Web Service
// Worker / edge runtimes that expose `addEventListener('fetch')` — NOT Cloudflare
// workerd, whose `nodejs_compat` (which tegg needs for AsyncLocalStorage) only
// supports the module-worker format (`worker.ts`). Like `worker.ts`, nothing here
// is bundle-only; the bundler injects the scanned imports + manifest ahead of it.
// Bundle with `format: 'service-worker'` (see `bundle-sw.mjs`); the artifact is a
// classic script, not an ES module.
const app = new ServiceWorkerApp(path.join(path.dirname(fileURLToPath(import.meta.url)), 'app'));

// The platform hands a native FetchEvent (type + request + respondWith + waitUntil);
// it satisfies the app's minimal `{ type, request }` contract. These globals are the
// runtime's (workerd) — declared locally since this example compiles under Node libs.
interface ServiceWorkerFetchEvent {
  type: 'fetch';
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
  waitUntil(promise: Promise<unknown>): void;
}
declare function addEventListener(type: 'fetch', listener: (event: ServiceWorkerFetchEvent) => void): void;

addEventListener('fetch', (event) => {
  event.respondWith(app.handleEvent<Response>(event));
});
