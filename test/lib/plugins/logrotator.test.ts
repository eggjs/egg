import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import fs from 'node:fs/promises';
import { importResolve } from '@eggjs/utils';
import { MockApplication, createApp } from '../../utils.js';

describe('test/lib/plugins/logrotator.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = createApp('apps/logrotator-app');
    return app.ready();
  });

  after(() => app.close());

  it('should rotate log file default', async () => {
    const file = importResolve('egg-logrotator/app/schedule/rotate_by_file.js');
    // console.log('job', file);
    await app.runSchedule(file);
    await scheduler.wait(1000);
    const files = (await fs.readdir(app.config.logger.dir)).filter(f => f.includes('.log.'));
    assert(files.length > 0);
    files.forEach(file => {
      assert(/\.log\.\d{4}-\d{2}-\d{2}$/.test(file));
    });
  });
});
