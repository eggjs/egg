import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';

import AppService from './fixtures/apps/schedule-app/modules/multi-module-service/AppService.ts';
import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/Subscription.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('schedule-app'),
    });
    await app.ready();
  });

  it('should work', async () => {
    let called = false;
    mm(AppService.prototype, 'findApp', () => {
      called = true;
    });
    await app.runSchedule('foo');
    assert(called);
  });
});
