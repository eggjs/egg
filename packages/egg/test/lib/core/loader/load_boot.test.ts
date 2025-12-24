import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';

import { describe, it, beforeAll } from '@voidzero-dev/vite-plus/test';

import { type MockApplication, createApp } from '../../../utils.ts';

describe('test/lib/core/loader/load_boot.test.ts', () => {
  describe('CommonJS', () => {
    let app: MockApplication;

    beforeAll(async () => {
      app = createApp('apps/boot-app');
      await app.ready();
    });

    it('should load app.js', async () => {
      await scheduler.wait(100);
      await app.close();
      app.expectLog('app is ready');

      // should restore
      const logContent = await fs.readFile(path.join(app.config.logger.dir, 'egg-agent.log'), 'utf-8');
      assert(!logContent.includes("agent can't call sendToApp before server started"));
      assert(app.messengerLog, 'app.messengerLog should exists');

      assert.deepStrictEqual(app.bootLog, [
        'configDidLoad',
        'didLoad',
        'willReady',
        'didReady',
        'serverDidReady',
        'beforeClose',
      ]);
      // @ts-expect-error bootLog has no type definition
      assert.deepStrictEqual(app.agent.bootLog, [
        'configDidLoad',
        'didLoad',
        'willReady',
        'didReady',
        'serverDidReady',
        'beforeClose',
      ]);
    });
  });

  describe('ESM', () => {
    let app: MockApplication;

    beforeAll(async () => {
      app = createApp('apps/boot-app-esm');
      await app.ready();
    });

    it('should load app.js', async () => {
      await scheduler.wait(100);
      await app.close();
      app.expectLog('app is ready');

      // should restore
      const logContent = await fs.readFile(path.join(app.config.logger.dir, 'egg-agent.log'), 'utf-8');
      assert(!logContent.includes("agent can't call sendToApp before server started"));
      assert(app.messengerLog, 'app.messengerLog should exists');

      assert.deepStrictEqual(app.bootLog, [
        'configDidLoad',
        'didLoad',
        'willReady',
        'didReady',
        'serverDidReady',
        'beforeClose',
      ]);
      // @ts-expect-error bootLog has no type definition
      assert.deepStrictEqual(app.agent.bootLog, [
        'configDidLoad',
        'didLoad',
        'willReady',
        'didReady',
        'serverDidReady',
        'beforeClose',
      ]);
    });
  });
});
