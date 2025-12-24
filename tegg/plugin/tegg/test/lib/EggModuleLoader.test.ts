import assert from 'node:assert/strict';

// import { scheduler } from 'node:timers/promises';

import { mm } from '@eggjs/mock';
import { describe, it, afterEach } from '@voidzero-dev/vite-plus/test';

import { getAppBaseDir } from '../utils.ts';

describe('test/lib/EggModuleLoader.test.ts', () => {
  afterEach(() => {
    return mm.restore();
  });

  describe('has recursive dependency module', () => {
    it('should throw error', async () => {
      const app = mm.app({
        baseDir: getAppBaseDir('recursive-module-app'),
      });
      await assert.rejects(async () => {
        // await scheduler.wait(1000);
        await app.ready();
      }, /module has recursive deps/);
      await app.close();
    });
  });

  describe('module config in wrong order', () => {
    it('should load module success', async () => {
      const app = mm.app({
        baseDir: getAppBaseDir('wrong-order-app'),
      });
      await app.ready();
      await app.close();
    });
  });
});
