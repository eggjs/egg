import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ServiceWorkerApp } from '@eggjs/service-worker';

// The *service-worker* format entry: registers on the global `fetch` event instead of
// `export default { fetch }`. Targets Web Service Worker / edge runtimes — NOT workerd
// (its nodejs_compat only supports module format; see README). Bundle with
// `format: 'service-worker'` (bundle-sw.mjs).
const app = new ServiceWorkerApp(path.join(path.dirname(fileURLToPath(import.meta.url)), 'app'));

// A native FetchEvent satisfies the app's minimal `{ type, request }` contract; these
// globals are the runtime's, declared locally since the example compiles under Node libs.
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
