import mm, { MockApplication } from '../src/index.js';

describe('test/mock_cluster_without_security_plugin.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.cluster({
      baseDir: 'disable-security',
      coverage: false,
    });
    return app.ready();
  });
  after(() => app.close());

  afterEach(mm.restore);

  it('should mock cluster work', () => {
    app.mockSession({
      user: {
        foo: 'bar',
      },
      hello: 'egg mock session data',
    });
    return app.httpRequest()
      .get('/session')
      .expect({
        user: {
          foo: 'bar',
        },
        hello: 'egg mock session data',
      });
  });
});
