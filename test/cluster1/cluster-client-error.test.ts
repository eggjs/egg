import { readFile } from 'node:fs/promises';
import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { MockApplication, createApp, getFilepath } from '../utils.js';

describe('test/cluster1/cluster-client-error.test.ts', () => {
  let app: MockApplication;
  before(async () => {
    app = createApp('apps/cluster-client-error');

    let err;
    try {
      await app.ready();
    } catch (e) {
      err = e;
    }
    assert(err);
  });

  it('should close even if app throw error', () => {
    return app.close();
  });

  it('should follower not throw error', async () => {
    await scheduler.wait(1000);
    const cnt = await readFile(
      getFilepath('apps/cluster-client-error/logs/cluster-client-error/common-error.log'), 'utf8');
    assert(!cnt.includes('ECONNRESET'));
  });
});
