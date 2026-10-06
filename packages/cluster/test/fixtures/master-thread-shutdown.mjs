import { once } from 'node:events';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { detectPort } from 'detect-port';

import { Master } from '../../src/index.ts';
const mode = process.argv[2];
const master = new Master({
  baseDir: path.join(import.meta.dirname, 'apps', mode === 'hang' ? 'worker-close-timeout' : 'before-close'),
  framework: path.join(import.meta.dirname, '../../../egg'),
  startMode: 'worker_threads',
  workers: 1,
  port: await detectPort(),
});
await master.ready();
if (mode === 'race') {
  // Close apps while their cluster-client leader is still alive; isolate the agent race.
  await master.killAppWorkers(5000);
  let forks = 0;
  master.agentWorker.on('agent_forked', () => forks++);
  const exited = once(master.agentWorker.instance.instance, 'exit');
  await master.agentWorker.instance.instance.terminate();
  await exited;
  master.closed = true;
  const started = Date.now();
  await master._doClose();
  console.log('shutdown-duration', Date.now() - started);
  await sleep(1200);
  console.log('shutdown-reforks', forks);
  process.exit(0);
} else {
  await master.close();
}
