import assert from 'node:assert';
import { describe, it, beforeEach } from 'vitest';
import { TimerUtil } from '@eggjs/tegg-common-util';
import { BackgroundTaskHelper } from '../src/index.js';

describe('test/BackgroundTaskHelper.test.ts', () => {
  let helper: BackgroundTaskHelper;

  beforeEach(() => {
    helper = new BackgroundTaskHelper();
    helper.logger = console as any;
  });

  describe('fn is ok', () => {
    it('should done', async () => {
      let run = false;
      helper.run(async () => {
        await TimerUtil.sleep(10);
        run = true;
      });

      await helper.doPreDestroy();
      assert(run);
    });
  });

  describe('fn is timeout', () => {
    it('should done', async () => {
      let run = false;
      helper.timeout = 10;
      helper.run(async () => {
        await TimerUtil.sleep(100);
        run = true;
      });

      await helper.doPreDestroy();
      assert(run === false);
    });
  });

  describe('fn reject', () => {
    it('should done', async () => {
      helper.run(async () => {
        await TimerUtil.sleep(10);
        throw new Error('mock error');
      });

      await helper.doPreDestroy();
    });
  });

  describe('fn throw error', () => {
    it('should done', async () => {
      helper.run(() => {
        throw new Error('mock error');
      });

      await helper.doPreDestroy();
    });
  });

  describe('recursive fn', () => {
    it('should done', async () => {
      let runDone = 0;
      helper.run(async () => {
        await TimerUtil.sleep(10);
        runDone++;
        helper.run(async () => {
          await TimerUtil.sleep(10);
          runDone++;
        });
      });

      await helper.doPreDestroy();
      assert(runDone === 2);
    });
  });
});
