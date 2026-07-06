import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ServiceWorkerApp } from '@eggjs/service-worker';

const app = new ServiceWorkerApp(path.join(path.dirname(fileURLToPath(import.meta.url)), 'app'));
const server = await app.serve({ port: 7001 });
console.log('service worker listening on http://127.0.0.1:7001');
console.log('  GET  /hello/?name=you');
console.log('  POST /mcp/calc (MCP streamable http)');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    console.log(`received ${signal}, shutting down`);
    app
      .destroy()
      .then(() => process.exit(0))
      .catch((e) => {
        console.error(e);
        process.exit(1);
      });
  });
}

void server;
