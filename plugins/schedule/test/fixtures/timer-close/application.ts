import assert from 'node:assert/strict';
import { createServer, get } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

import { start } from 'egg';

const app = await start({ baseDir: new URL('./app/', import.meta.url).pathname, ignoreWarning: true });
try {
  if (process.argv[2] === 'http') {
    const server = createServer(app.callback());
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      assert(address && typeof address !== 'string');
      await new Promise<void>((resolve, reject) => {
        get(`http://127.0.0.1:${address.port}/`, { agent: false }, (response) => {
          assert.equal(response.statusCode, 200);
          response.resume();
          response.on('end', resolve);
        }).on('error', reject);
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  } else {
    // Give the asynchronous serverDidReady hook time to start cron timers.
    await sleep(100);
  }
} finally {
  await app.close();
}
console.log('closed');
