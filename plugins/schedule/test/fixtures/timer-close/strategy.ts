import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';

import safeTimers from 'safe-timers';

import type Agent from '../../../src/app/extend/agent.ts';
import type { EggScheduleConfig } from '../../../src/config/config.default.ts';
import { Scheduler } from '../../../src/lib/schedule.ts';
import { WorkerStrategy } from '../../../src/lib/strategy/worker.ts';

let calls = 0;
const agent = {
  getLogger: () => ({ info() {}, warn() {}, debug() {} }),
  get schedule() {
    return scheduler;
  },
  messenger: {
    sendRandom() {
      calls++;
    },
  },
} as unknown as Agent;
const scheduler = new Scheduler(agent);
scheduler.use('worker', WorkerStrategy);
const mode = process.argv[2];
const config: EggScheduleConfig = { type: 'worker', interval: 60000 };
if (mode === 'cron') {
  delete config.interval;
  config.cron = '0 0 * * *';
} else if (mode === 'long') {
  config.interval = safeTimers.maxInterval + 10000;
} else if (mode === 'immediate') {
  delete config.interval;
  config.immediate = true;
}
scheduler.registerSchedule({ key: 'shutdown-test', schedule: config } as Parameters<Scheduler['registerSchedule']>[0]);
await scheduler.start();
await scheduler.close();
// A late serverDidReady hook must not reopen a scheduler after shutdown.
await scheduler.start();
await scheduler.close();
assert(!process.getActiveResourcesInfo().some((type) => type === 'Timeout' || type === 'Immediate'));
await nextTurn();
assert.equal(calls, 0);
assert.equal(scheduler.closed, true);
console.log('closed');
