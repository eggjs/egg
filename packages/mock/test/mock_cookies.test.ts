import { strict as assert } from 'node:assert';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_cookies.test.ts', () => {
  let app: MockApplication;
  before(done => {
    app = mm.app({
      baseDir: getFixtures('apps/mock_cookies'),
    });
    app.ready(done);
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should not return when don\'t mock cookies', done => {
    const ctx = app.mockContext();
    assert(!ctx.cookies.get('foo'));

    app.httpRequest()
      .get('/')
      .expect(function(res) {
        assert.deepEqual(res.body, {});
      })
      .expect(200, done);
  });

  it('should mock cookies', done => {
    app.mockCookies({
      foo: 'bar cookie',
    });

    app.httpRequest()
      .get('/')
      .expect({
        cookieValue: 'bar cookie',
        cookiesValue: 'bar cookie',
      })
      .expect(200, done);
  });

  it('should pass cookie opt', done => {
    app.mockCookies({});

    app.httpRequest()
      .get('/')
      .set('cookie', 'foo=bar cookie')
      .expect({
        cookieValue: 'bar cookie',
        cookiesValue: 'bar cookie',
      })
      .expect(200, done);
  });
});
