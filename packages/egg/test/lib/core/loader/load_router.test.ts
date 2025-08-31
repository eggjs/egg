import { createApp, MockApplication } from '../../../utils.js';

describe('test/lib/core/loader/load_router.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = createApp('apps/app-router');
    return app.ready();
  });
  after(() => app.close());

  it('should load app/router.js', async () => {
    await app.httpRequest()
      .get('/')
      .expect(200)
      .expect('hello');

    await app.httpRequest()
      .get('/home')
      .expect(200)
      .expect('hello');
  });
});
