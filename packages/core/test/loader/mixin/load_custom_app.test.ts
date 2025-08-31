import assert from 'node:assert/strict';

import { createApp, type Application } from '../../helper.js';

describe('test/loader/mixin/load_custom_app.test.ts', () => {
  describe('app.js as function', () => {
    let app: Application;
    before(async () => {
      app = createApp('plugin');
      await app.loader.loadPlugin();
      await app.loader.loadConfig();
      await app.loader.loadCustomApp();
    });
    after(() => app.close());

    it('should load app.js', () => {
      assert((app as any).b === 'plugin b');
      assert((app as any).c === 'plugin c');
      assert((app as any).app === 'app');
    });

    it("should app.js of plugin before application's", () => {
      assert((app as any).dateB <= (app as any).date);
      assert((app as any).dateC <= (app as any).date);
    });

    it('should not load plugin that is disabled', () => {
      assert(!(app as any).a);
    });
  });
});
