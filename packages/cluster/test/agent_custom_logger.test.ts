import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';

import { mm, type MockClusterApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll } from 'vitest';

import { cluster, getFilepath } from './utils.ts';

// TODO: flaky test on windows, Hook timed out in 20000ms
describe.skipIf(process.platform === 'win32')('test/agent_worker.test.ts > agent custom loggers', () => {
  let app: MockClusterApplication;

  beforeAll(() => {
    app = cluster('apps/custom-logger');
    return app.ready();
  });
  afterAll(() => app.close());

  // keep mm.restore behavior parity with original sibling describe
  afterAll(() => mm.restore());

  it('should support custom logger in agent', async () => {
    await scheduler.wait(1500);
    const content = await readFile(getFilepath('apps/custom-logger/logs/monitor.log'), 'utf8');
    assert.match(content, /hello monitor!/);
  });
});
