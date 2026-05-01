import { existsSync, readFileSync, statSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getFixtures, getLogContent } from './utils.ts';

async function waitForLog(logPath: string, match: string, since: number) {
  const start = Date.now();
  while (Date.now() - start < 5000) {
    if (existsSync(logPath) && statSync(logPath).mtimeMs >= since) {
      const log = readFileSync(logPath, 'utf8');
      if (log.includes(match)) {
        return log;
      }
    }
    await sleep(100);
  }
  throw new Error(`Log ${logPath} did not contain "${match}"`);
}

describe.skipIf(process.platform === 'win32')('test/stop.test.ts', () => {
  let app: MockApplication | undefined;
  let appStartedAt = 0;
  beforeAll(async () => {
    appStartedAt = Date.now();
    app = mm.cluster({ baseDir: getFixtures('stop'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app?.close());

  it('should stop interval timer after cluster closes', async () => {
    const scheduleLogPath = getFixtures('stop/logs/stop/egg-schedule.log');
    await waitForLog(scheduleLogPath, 'app/schedule/interval.js', appStartedAt);

    const logPath = getFixtures('stop/logs/stop/stop-web.log');
    const beforeCloseLog = existsSync(logPath) ? getLogContent('stop') : '';
    const beforeCloseCount = contains(beforeCloseLog, 'interval');
    await app!.close();
    app = undefined;

    await sleep(10000);
    const log = existsSync(logPath) ? getLogContent('stop') : '';
    expect(contains(log, 'interval')).toBe(beforeCloseCount);
  });
});
