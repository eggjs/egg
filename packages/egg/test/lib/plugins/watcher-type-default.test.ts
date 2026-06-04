import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { scheduler } from 'node:timers/promises';

import { describe, it, beforeAll, afterAll } from 'vitest';

import { cluster, type MockApplication, getFilepath } from '../../utils.ts';

describe('test/lib/plugins/watcher.test.ts', () => {
  describe('config.watcher.type is default', () => {
    let app: MockApplication;
    beforeAll(() => {
      app = cluster('apps/watcher-type-default');
      app.coverage(false);
      return app.ready();
    }, 60000);

    afterAll(() => app.close());

    it('should warn user', async () => {
      await scheduler.wait(3000);
      const logPath = getFilepath('apps/watcher-type-default/logs/watcher-type-default/egg-agent.log');
      const content = fs.readFileSync(logPath, 'utf8');
      assert.match(content, /defaultEventSource watcher will NOT take effect/);
    });
  });
});
