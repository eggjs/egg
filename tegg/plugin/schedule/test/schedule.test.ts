import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { TimerUtil } from '@eggjs/tegg-common-util';
import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';

const FooSubscriberFilePath = path.join(
  import.meta.dirname,
  'fixtures',
  'schedule-app',
  'app',
  'subscriber',
  'Subscriber.ts',
);

describe('plugin/schedule/test/schedule.test.ts', () => {
  let app: MockApplication;

  afterEach(async () => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: path.join(import.meta.dirname, 'fixtures', 'schedule-app'),
    });
    await app.ready();
  });

  afterAll(() => {
    return app.close();
  });

  it('schedule should work', async () => {
    await TimerUtil.sleep(1000);
    const scheduleLog = await getScheduleLogContent('schedule-app');
    assert.match(scheduleLog, /schedule called/);
  });

  // FIXME: Cannot find schedule D:\a\egg\egg\tegg\plugin\schedule\test\fixtures\schedule-app\app\subscriber\Subscriber.ts
  it.skipIf(process.platform === 'win32')('schedule work with app.runSchedule', async () => {
    await app.runSchedule(FooSubscriberFilePath);
  });
});

async function getScheduleLogContent(name: string) {
  const logPath = path.join(import.meta.dirname, 'fixtures', name, 'logs', name, `${name}-web.log`);
  // schedule called
  return fs.readFile(logPath, 'utf8');
}
