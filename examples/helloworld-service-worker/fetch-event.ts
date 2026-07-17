import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ServiceWorkerApp } from '@eggjs/service-worker';

// A ServiceWorkerApp plugs straight into the Web Service Worker fetch model:
//   self.addEventListener('fetch', event => event.respondWith(app.handleEvent(event)));
// A real SW/edge runtime hands you a native FetchEvent, which satisfies the app's
// minimal { type, request } contract. Node has no such global, so this shims a
// FetchEvent to show the exact wiring, then dispatches one request through it.

const app = new ServiceWorkerApp(path.join(path.dirname(fileURLToPath(import.meta.url)), 'app'));
await app.init();

interface FetchEventLike {
  type: 'fetch';
  request: Request;
  respondWith(r: Promise<Response>): void;
}

let fetchListener: ((event: FetchEventLike) => void) | undefined;
const self = {
  addEventListener(type: 'fetch', listener: (event: FetchEventLike) => void) {
    if (type === 'fetch') fetchListener = listener;
  },
};

// Identical to the wiring inside a browser/edge Service Worker:
self.addEventListener('fetch', (event) => {
  event.respondWith(app.handleEvent<Response>(event));
});

// Dispatch one request the way the runtime does, then read what respondWith captured:
let captured: Promise<Response> | undefined;
const event: FetchEventLike = {
  type: 'fetch',
  request: new Request('http://localhost/hello/?name=you'),
  respondWith(r) {
    captured = r;
  },
};
fetchListener!(event);
const response = await captured!;
console.log(response.status, await response.json()); // 200 { message: 'hello, you' }

await app.destroy();
