import { setTimeout } from 'node:timers/promises';
import { parentPort, workerData } from 'node:worker_threads';

import { WORKER_THREAD_GRACEFUL_EXIT } from '../../src/worker_protocol/worker-thread.ts';
parentPort.on('message', async (message) => {
  if (message === WORKER_THREAD_GRACEFUL_EXIT) {
    if (workerData?.hang) return;
    await setTimeout(50);
    parentPort.postMessage({ action: 'closed' });
    process.exit(0);
  } else if (message.action === 'exit') process.exit(0);
});
parentPort.postMessage({ action: 'ready' });
