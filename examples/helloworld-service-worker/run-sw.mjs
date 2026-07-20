import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Drive the service-worker-format bundle (`npm run bundle:sw`) in a minimal Web Service
// Worker shell: shim a global `addEventListener('fetch')`, load the classic script (it
// registers its listener on load), then dispatch FetchEvents. A real edge SW runtime
// wires this natively (not workerd — see README).
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let fetchListener;
globalThis.addEventListener = (type, listener) => {
  if (type === 'fetch') fetchListener = listener;
};

require(path.join(here, '.worker-sw', 'worker.cjs'));
if (!fetchListener) throw new Error('the bundle did not register a fetch listener');

async function dispatch(request) {
  let captured;
  fetchListener({ type: 'fetch', request, respondWith: (r) => (captured = r), waitUntil: () => {} });
  return await captured;
}

const hello = await dispatch(new Request('http://localhost/hello/?name=sw'));
console.log('service-worker bundle /hello:', hello.status, await hello.json());

const mcp = await dispatch(
  new Request('http://localhost/mcp/calc/stream', {
    method: 'POST',
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'add', arguments: { a: 7, b: 35 } },
    }),
  }),
);
console.log('service-worker bundle /mcp: ', mcp.status, (await mcp.text()).trim().split('\n').pop());
