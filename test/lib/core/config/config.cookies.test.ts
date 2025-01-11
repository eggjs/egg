import { strict as assert } from 'node:assert';
import { MockApplication, createApp } from '../../../utils.js';

describe('test/lib/core/config/config.cookies.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = createApp('apps/app-config-cookies');
    return app.ready();
  });
  after(() => app.close());

  it('should auto set sameSite cookie', async () => {
    const res = await app.httpRequest()
      .get('/');
    assert(res.status === 200);
    assert(res.text === 'hello');
    const cookies = res.headers['set-cookie'];
    assert(cookies.length >= 1);
    for (const cookie of cookies) {
      assert(cookie.includes('; samesite=lax'));
    }
  });
});
