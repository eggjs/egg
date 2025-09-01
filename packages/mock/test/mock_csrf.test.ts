import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_csrf.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.app({
      baseDir: getFixtures('demo'),
    });
    return app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should pass', done => {
    app.mockCsrf();
    app.httpRequest()
      .post('/')
      .expect(200)
      .expect('done', done);
  });

  it('should 403 Forbidden', async () => {
    await app.httpRequest()
      .post('/')
      .expect(403)
      .expect(/ForbiddenError: missing csrf token/);
  });
});
