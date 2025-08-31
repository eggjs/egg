import assert from 'node:assert/strict';

import { request } from '@eggjs/supertest';
import { mm } from 'mm';

import { createApp, type Application } from '../../helper.js';

describe('test/loader/mixin/load_extend_class.test.ts', () => {
  let app: Application;
  before(async () => {
    app = createApp('extend-with-class');
    await app.loader.loadPlugin();
    await app.loader.loadConfig();
    await app.loader.loadRequestExtend();
    await app.loader.loadResponseExtend();
    await app.loader.loadApplicationExtend();
    await app.loader.loadContextExtend();
    await app.loader.loadController();
    await app.loader.loadRouter();
    await app.loader.loadMiddleware();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should load app.context app.request app.response', () => {
    assert((app as any).appApplication);

    return request(app.callback())
      .get('/')
      .expect({
        returnAppContext: 'app context',
        returnAppRequest: 'app request',
        returnAppResponse: 'app response',
        returnAppApplication: 'app application',
        status: 200,
        etag: 'etag ok',
      })
      .expect(200);
  });
});
