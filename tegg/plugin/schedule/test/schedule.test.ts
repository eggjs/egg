import path from 'node:path';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';
import { TimerUtil } from '@eggjs/tegg-common-util';

const FooSubscriberFilePath = path.join(
  import.meta.dirname,
  'fixtures',
  'schedule-app',
  'app',
  'subscriber',
  'Subscriber.ts'
);

describe('plugin/schedule/test/schedule.test.ts', () => {
  let app: MockApplication;

  afterEach(async () => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: path.join(import.meta.dirname, 'fixtures', 'schedule-app'),
    });
    await app.ready();
  });

  after(() => {
    return app.close();
  });

  it('schedule should work', async () => {
    await TimerUtil.sleep(1000);
    const scheduleLog = await getScheduleLogContent('schedule-app');
    assert.match(scheduleLog, /schedule called/);
  });

  it('schedule work with app.runSchedule', async () => {
    await app.runSchedule(FooSubscriberFilePath);
  });
});

async function getScheduleLogContent(name: string) {
  const logPath = path.join(import.meta.dirname, 'fixtures', name, 'logs', name, `${name}-web.log`);
  // schedule called
  return fs.readFile(logPath, 'utf8');
}
