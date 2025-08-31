import { request } from '@eggjs/supertest';

import { createApp, type Application } from '../../helper.js';

describe('test/loader/mixin/load_helper_extend.test.ts', () => {
  describe('helper', () => {
    let app: Application;
    before(async () => {
      app = createApp('helper');
      await app.loader.loadPlugin();
      await app.loader.loadConfig();
      await app.loader.loadApplicationExtend();
      await app.loader.loadContextExtend();
      await app.loader.loadHelperExtend();
      await app.loader.loadController();
      await app.loader.loadRouter();
      await app.loader.loadMiddleware();
    });
    after(() => app.close());

    it('should load extend from chair, plugin and helper', async () => {
      await request(app.callback())
        .get('/')
        .expect(/app: true/)
        .expect(/plugin a: false/)
        .expect(/plugin b: true/)
        .expect(200);
    });

    it('should override chair by application', async () => {
      await request(app.callback())
        .get('/')
        .expect(/override: app/)
        .expect(200);
    });

    it('should not call directly', async () => {
      await request(app.callback())
        .get('/')
        .expect(/not exists on locals: false/)
        .expect(200);
    });
  });

  describe('no Helper', () => {
    let app: Application;
    after(() => app.close());

    it('should not extend helper', async () => {
      app = createApp('no-helper');
      // should not throw
      await app.loader.loadHelperExtend();
    });
  });
});
