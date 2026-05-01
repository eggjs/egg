import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, beforeAll, expect } from 'vitest';

import { contains, getFixtures } from './utils.ts';

function readLogIfExists(logPath: string) {
  try {
    return readFileSync(logPath, 'utf8');
  } catch (err) {
    const error = err as { code?: string };
    if (error.code === 'ENOENT') {
      return '';
    }
    throw err;
  }
}

async function waitForNewLog(logPath: string, match: string, previousLog: string) {
  const start = Date.now();
  while (Date.now() - start < 5000) {
    const log = readLogIfExists(logPath);
    const appendedLog = log.startsWith(previousLog) ? log.slice(previousLog.length) : log;
    if (appendedLog.includes(match)) {
      return log;
    }
    await sleep(100);
  }
  throw new Error(`Log ${logPath} did not contain "${match}"`);
}

describe.skipIf(process.platform === 'win32')('test/stop.test.ts', () => {
  let app: MockApplication | undefined;
  let scheduleLogBeforeStart = '';
  beforeAll(async () => {
    scheduleLogBeforeStart = readLogIfExists(getFixtures('stop/logs/stop/egg-schedule.log'));
    app = mm.cluster({ baseDir: getFixtures('stop'), workers: 2 });
    // app.debug();
    await app.ready();
  });
  afterAll(() => app?.close());

  it('should stop interval timer after cluster closes', async () => {
    const scheduleLogPath = getFixtures('stop/logs/stop/egg-schedule.log');
    await waitForNewLog(scheduleLogPath, 'app/schedule/interval.js', scheduleLogBeforeStart);

    const logPath = getFixtures('stop/logs/stop/stop-web.log');
    const beforeCloseLog = readLogIfExists(logPath);
    const beforeCloseCount = contains(beforeCloseLog, 'interval');
    await app!.close();
    app = undefined;

    await sleep(10000);
    const log = readLogIfExists(logPath);
    expect(contains(log, 'interval')).toBe(beforeCloseCount);
  });
});
