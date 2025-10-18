import assert from 'node:assert/strict';

import { mm } from '@eggjs/mock';

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
      await assert.rejects(() => app.ready(), /module has recursive deps/);
      return app.close();
    });
  });

  describe('module config in wrong order', () => {
    it('should load module success', async () => {
      const app = mm.app({
        baseDir: getAppBaseDir('wrong-order-app'),
      });
      await app.ready();
      return app.close();
    });
  });
});
