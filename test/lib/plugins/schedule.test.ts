import path from 'node:path';
import fs from 'node:fs';
import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { cluster, getFilepath } from '../../utils.js';

describe('test/lib/plugins/schedule.test.ts', () => {
  it('should schedule work', async () => {
    const app = cluster('apps/schedule', {
      workers: 2,
    });
    // app.debug();
    app.coverage(false);
    await app.ready();
    await scheduler.wait(7000);
    await app.close();
    const log = getLogContent('schedule');
    const count = contains(log, 'cron wow');
    assert(count >= 1);
    assert(count <= 2);

    // should support Subscription class on app.Subscription
    assert.equal(contains(log, 'Info about your task'), 1);
  });
});

function getLogContent(name: string) {
  const logPath = path.join(getFilepath('apps'), name, 'logs', name, `${name}-web.log`);
  return fs.readFileSync(logPath, 'utf8');
}

function contains(content: string, match: string) {
  return content.split('\n').filter(line => line.includes(match)).length;
}
