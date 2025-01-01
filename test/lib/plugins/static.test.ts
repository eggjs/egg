import { createApp, MockApplication } from '../../utils.js';

describe('test/lib/plugins/static.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = createApp('apps/static-server');
    return app.ready();
  });

  it('should get exists js file', () => {
    return app.httpRequest()
      .get('/public/foo.js')
      .expect(/alert\(\'bar\'\);\r?\n/)
      .expect(200);
  });
});
