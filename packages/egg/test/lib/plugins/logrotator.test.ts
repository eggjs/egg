import { describe, it, beforeAll, afterAll } from 'vitest';
import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import fs from 'node:fs/promises';

import { importResolve } from '@eggjs/utils';
import { type MockApplication, createApp } from '../../utils.ts';

// FIXME: merge @eggjs/logrotator
describe.skip('test/lib/plugins/logrotator.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = createApp('apps/logrotator-app');
    return app.ready();
  });

  afterAll(() => app.close());

  it('should rotate log file default', async () => {
    const file = importResolve(
      '@eggjs/logrotator/dist/esm/app/schedule/rotate_by_file.js',
      {
        paths: [__dirname],
      }
    );
    // console.log('job', file);
    await app.runSchedule(file);
    await scheduler.wait(1000);
    const files = (await fs.readdir(app.config.logger.dir)).filter(f =>
      f.includes('.log.')
    );
    console.log(files);
    assert(files.length > 0);
    files.forEach(file => {
      assert(/\.log\.\d{4}-\d{2}-\d{2}$/.test(file));
    });
  });
});
