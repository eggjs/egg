import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getAgentLogContent, getFixtures, getLogContent } from './utils.ts';

describe('cluster', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('safe-timers'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support interval and cron', async () => {
    await sleep(5000);

    const log = getLogContent('safe-timers');
    // console.log(log);
    expect(contains(log, 'interval')).toBe(1);
    expect(contains(log, 'cron')).toBe(1);

    const agentLog = getAgentLogContent('safe-timers');
    // console.log(agentLog);
    expect(contains(agentLog, 'reschedule 4321')).toBe(2);
    expect(contains(agentLog, 'reschedule')).toBeGreaterThanOrEqual(4);
  });
});
