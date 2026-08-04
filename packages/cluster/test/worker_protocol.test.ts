import { strict as assert } from 'node:assert';
import { once } from 'node:events';
import { Worker } from 'node:worker_threads';

import { describe, it } from 'vitest';

describe('test/worker_protocol.test.ts', () => {
  it('uses parentPort without terminating the main process', async () => {
    const worker = new Worker(new URL('./fixtures/worker-thread-io.mjs', import.meta.url));
    const workerId = worker.threadId;

    const [message] = await once(worker, 'message');
    assert.deepEqual(message, {
      action: 'ready',
      senderWorkerId: String(workerId),
    });

    worker.postMessage('kill');
    const [exitCode] = await once(worker, 'exit');
    assert.equal(exitCode, 1);
  });
});
