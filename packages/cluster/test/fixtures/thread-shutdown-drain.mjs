import { fileURLToPath } from 'node:url';

import { AgentThreadUtils } from '../../src/utils/mode/impl/worker_threads/agent.ts';
import { AppThreadUtils } from '../../src/utils/mode/impl/worker_threads/app.ts';

let signalReady;
const ready = new Promise((resolve) => {
  signalReady = resolve;
});
const deps = {
  log() {},
  logger: {
    error(error) {
      throw error;
    },
  },
  messenger: {
    send(message) {
      if (message.action === 'ready') signalReady();
    },
  },
};
const workerFile = fileURLToPath(new URL('./thread-shutdown.mjs', import.meta.url));
const utils =
  process.argv[2] === 'agent'
    ? new AgentThreadUtils({ agentWorkerFile: workerFile }, deps)
    : new AppThreadUtils({ appWorkerFile: workerFile, port: 7001, workers: 1 }, deps);
utils.fork();
await ready;
await utils.kill(5000);
const closedAt = Date.now();
process.once('beforeExit', () => console.log('shutdown-drain-ms', Date.now() - closedAt));
