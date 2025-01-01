import { strict as assert } from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MockApplication, createApp } from '../../../utils.js';

describe('test/lib/core/loader/load_boot.test.ts', () => {
  describe('CommonJS', () => {
    let app: MockApplication;

    before(() => {
      app = createApp('apps/boot-app');
      return app.ready();
    });

    it('should load app.js', async () => {
      await app.close();
      app.expectLog('app is ready');

      // should restore
      const logContent = await fs.readFile(path.join(app.config.logger.dir, 'egg-agent.log'), 'utf-8');
      assert(!logContent.includes('agent can\'t call sendToApp before server started'));
      assert(app.messengerLog, 'app.messengerLog should exists');

      assert.deepStrictEqual(app.bootLog, [ 'configDidLoad',
        'didLoad',
        'willReady',
        'didReady',
        'serverDidReady',
        'beforeClose',
      ]);
      assert.deepStrictEqual(app.agent.bootLog, [ 'configDidLoad',
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

    before(() => {
      app = createApp('apps/boot-app-esm');
      return app.ready();
    });

    it('should load app.js', async () => {
      await app.close();
      app.expectLog('app is ready');

      // should restore
      const logContent = await fs.readFile(path.join(app.config.logger.dir, 'egg-agent.log'), 'utf-8');
      assert(!logContent.includes('agent can\'t call sendToApp before server started'));
      assert(app.messengerLog, 'app.messengerLog should exists');

      assert.deepStrictEqual(app.bootLog, [ 'configDidLoad',
        'didLoad',
        'willReady',
        'didReady',
        'serverDidReady',
        'beforeClose',
      ]);
      assert.deepStrictEqual(app.agent.bootLog, [ 'configDidLoad',
        'didLoad',
        'willReady',
        'didReady',
        'serverDidReady',
        'beforeClose',
      ]);
    });
  });
});
