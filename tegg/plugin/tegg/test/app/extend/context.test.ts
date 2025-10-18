import assert from 'node:assert/strict';

import { mm, type MockApplication } from '@eggjs/mock';
import { TimerUtil } from '@eggjs/tegg-common-util';

import AppService from '../../fixtures/apps/egg-app/modules/multi-module-service/AppService.ts';
import PersistenceService from '../../fixtures/apps/egg-app/modules/multi-module-repo/PersistenceService.ts';
import { LONG_STACK_DELIMITER } from '../../../src/lib/run_in_background.ts';
import { getAppBaseDir } from '../../utils.ts';

describe('test/app/extend/context.test.ts', () => {
  let app: MockApplication;

  after(async () => {
    await app.close();
  });

  afterEach(() => {
    return mm.restore();
  });

  before(async () => {
    app = mm.app({
      baseDir: getAppBaseDir('egg-app'),
    });
    await app.ready();
  });

  describe('getEggObject', () => {
    it('should work', async () => {
      await app.mockModuleContextScope(async ctx => {
        const appService = await ctx.getEggObject(AppService);
        assert(appService instanceof AppService);

        const persistenceService = await ctx.getEggObject(PersistenceService);
        assert(persistenceService instanceof PersistenceService);
      });
    });
  });

  describe('getEggObjectFromName', () => {
    it('should work', async () => {
      await app.mockModuleContextScope(async ctx => {
        const appService = await ctx.getEggObjectFromName('appService');
        assert(appService instanceof AppService);

        const persistenceService = await ctx.getEggObjectFromName('persistenceService');
        assert(persistenceService instanceof PersistenceService);
      });
    });
  });

  describe('beginModuleScope', () => {
    it('should be reentrant', async () => {
      await app.mockModuleContextScope(async ctx => {
        await ctx.beginModuleScope(async () => {
          // ...do nothing
        });
        assert.equal((ctx.teggContext as any).destroyed, false);
      });
    });
  });

  describe('runInBackground', () => {
    it('should notify background task helper', async () => {
      let backgroundIsDone = false;
      await app.mockModuleContextScope(async ctx => {
        ctx.runInBackground(async () => {
          await TimerUtil.sleep(100);
          backgroundIsDone = true;
        });
      });
      assert(backgroundIsDone);
    });

    it('recursive runInBackground should work', async () => {
      let backgroundIsDone = false;
      await app.mockModuleContextScope(async ctx => {
        ctx.runInBackground(async () => {
          await TimerUtil.sleep(100);
          ctx.runInBackground(async () => {
            await TimerUtil.sleep(100);
            backgroundIsDone = true;
          });
        });
      });
      assert(backgroundIsDone);
    });

    it('stack should be continuous', async () => {
      let backgroundError: Error | undefined;
      app.on('error', e => {
        backgroundError = e;
      });
      await app.mockModuleContextScope(async ctx => {
        ctx.runInBackground(async () => {
          throw new Error('background');
        });
        await TimerUtil.sleep(1000);
      });
      const stack = backgroundError?.stack ?? '';
      const fileName = process.platform === 'win32' ? import.meta.filename.replaceAll('\\', '/') : import.meta.filename;
      // background
      // at ~/plugin/tegg/test/app/extend/context.test.ts:88:17
      // at ~/plugin/tegg/test/app/extend/context.test.ts:82:21 (~/plugin/tegg/lib/run_in_background.ts:34:15)
      // at ~/node_modules/egg/app/extend/context.js:232:49
      // --------------------
      //   at Object.runInBackground (~/plugin/tegg/lib/run_in_background.ts:27:23)
      // at ~/plugin/tegg/test/app/extend/context.test.ts:87:13
      // at ~/plugin/tegg/app/extend/application.unittest.ts:49:22
      // at async Proxy.mockContextScope (~/node_modules/egg-mock/app/extend/application.js:81:12)
      // at async Context.<anonymous> (~/plugin/tegg/test/app/extend/context.test.ts:86:7)
      assert(stack.includes(fileName), `stack: ${stack} not includes '${fileName}'`);
      assert(stack.includes(LONG_STACK_DELIMITER), `stack: ${stack} not includes '${LONG_STACK_DELIMITER}'`);
    });
  });
});
