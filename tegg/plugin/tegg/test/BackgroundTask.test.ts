import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { mm, type MockApplication } from '@eggjs/mock';
import { BackgroundTaskHelper } from '@eggjs/tegg';
import { TimerUtil } from '@eggjs/tegg-common-util';
import { type EggContext, EggContextLifecycleUtil } from '@eggjs/tegg-runtime';
import { describe, it, afterAll, afterEach, beforeAll } from '@voidzero-dev/vite-plus/test';

import { CountService } from './fixtures/apps/background-app/modules/multi-module-background/CountService.ts';
import { getAppBaseDir } from './utils.ts';

describe('plugin/tegg/test/BackgroundTask.test.ts', () => {
  const appDir = getAppBaseDir('background-app');
  let app: MockApplication;

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: appDir,
    });
    await app.ready();
  });

  it('background task should work', async () => {
    app.mockCsrf();
    await app.httpRequest().get('/background').expect(200);

    const countService = await app.getEggObject(CountService);
    assert.equal(countService.count, 0);
    await TimerUtil.sleep(1000);
    assert.equal(countService.count, 1);
  });

  it('background timeout with humanize error info', async () => {
    app.mockCsrf();
    await app.httpRequest().get('/backgroudTimeout').expect(200);

    await TimerUtil.sleep(7000);
    const errorLog = fs.readFileSync(path.resolve(appDir, 'logs/egg-app/common-error.log'), 'utf-8');
    assert(errorLog.includes('Can not read property `testObj` because egg ctx has been destroyed ['));
  }, 10000);

  it('should release', async () => {
    let teggCtx: EggContext;
    await app.mockModuleContextScope(async (ctx) => {
      // teggCtx = ctx[TEGG_CONTEXT]
      teggCtx = ctx.teggContext;
      const backgroundTaskHelper = await ctx.getEggObject(BackgroundTaskHelper);
      backgroundTaskHelper.run(async () => {
        // do nothing
      });
    });
    const lifecycleList = EggContextLifecycleUtil.getObjectLifecycleList(teggCtx!);
    assert(lifecycleList.length === 0);
  });

  it('config should work', async () => {
    await app.mockModuleContextScope(async (ctx) => {
      const backgroundTaskHelper = await ctx.getEggObject(BackgroundTaskHelper);
      assert(backgroundTaskHelper.timeout === Infinity);
    });
  });
});
