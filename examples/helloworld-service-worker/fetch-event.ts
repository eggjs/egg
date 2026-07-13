import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ServiceWorkerApp } from '@eggjs/service-worker';
import { FetchEventImpl } from '@eggjs/service-worker-controller';

// A ServiceWorkerApp plugs straight into the Web Service Worker fetch model:
//   self.addEventListener('fetch', event => event.respondWith(app.handleEvent(event)));
// Node has no ServiceWorker global, so this shims `self` to show the exact wiring,
// then dispatches one FetchEvent through it. `app.handleEvent(event)` returns the
// Response you hand to `event.respondWith(...)`.

const app = new ServiceWorkerApp(path.join(path.dirname(fileURLToPath(import.meta.url)), 'app'));
await app.init();

let fetchListener: ((event: FetchEventImpl) => void) | undefined;
const self = {
  addEventListener(type: 'fetch', listener: (event: FetchEventImpl) => void) {
    if (type === 'fetch') fetchListener = listener;
  },
};

// Identical to the wiring inside a browser/edge Service Worker:
self.addEventListener('fetch', (event) => {
  event.respondWith(app.handleEvent<Response>(event));
});

// Dispatch one request the way the runtime does, then read what respondWith captured:
const event = new FetchEventImpl(new Request('http://localhost/hello/?name=you'));
fetchListener!(event);
const response = await event.responsePromise!;
console.log(response.status, await response.json()); // 200 { message: 'hello, you' }

await app.destroy();
