import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getAgentLogContent, getFixtures, getLogContent } from './utils.ts';

// FIXME: flaky test on windows, Hook timed out in 20000ms
describe.skipIf(process.platform === 'win32')('cluster', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.cluster({ baseDir: getFixtures('safe-timers'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app.close());

  it('should support interval and cron', async () => {
    await expect
      .poll(
        () => {
          const log = getLogContent('safe-timers');
          const agentLog = getAgentLogContent('safe-timers');
          return (
            contains(log, 'interval') >= 1 &&
            contains(log, 'cron') >= 1 &&
            contains(agentLog, 'reschedule 4321') >= 2 &&
            contains(agentLog, 'reschedule') >= 4
          );
        },
        {
          interval: 500,
          timeout: 15000,
        },
      )
      .toBe(true);

    const log = getLogContent('safe-timers');
    const agentLog = getAgentLogContent('safe-timers');
    expect(contains(log, 'interval')).toBeGreaterThanOrEqual(1);
    expect(contains(log, 'cron')).toBeGreaterThanOrEqual(1);
    expect(contains(agentLog, 'reschedule 4321')).toBeGreaterThanOrEqual(2);
    expect(contains(agentLog, 'reschedule')).toBeGreaterThanOrEqual(4);
  });
});
