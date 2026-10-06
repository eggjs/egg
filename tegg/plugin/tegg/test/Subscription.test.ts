import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterAll, afterEach, beforeAll } from 'vitest';

import AppService from './fixtures/apps/schedule-app/modules/multi-module-service/AppService.ts';
import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/Subscription.test.ts', () => {
  let app: MockApplication;

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('schedule-app'),
    });
    await app.ready();
  }, 30_000);

  it('should work', async () => {
    let called = false;
    mm(AppService.prototype, 'findApp', () => {
      called = true;
    });
    await app.runSchedule('foo');
    assert(called);
  });
});
