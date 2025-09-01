import { strict as assert } from 'node:assert';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_context.test.ts', () => {
  let app: MockApplication;
  before(done => {
    app = mm.app({
      baseDir: 'demo',
    });
    app.ready(done);
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should work on GET with user login', () => {
    app.mockContext({
      user: {
        foo: 'bar',
      },
      tracer: {
        traceId: 'foo-traceId',
      },
    });

    // assert(ctx.user.foo === 'bar');
    return app.httpRequest()
      .get('/user')
      .expect(200)
      .expect({
        foo: 'bar',
      })
      .expect('x-request-url', '/user');
  });

  it('should work on POST with user login', () => {
    app.mockContext({
      user: {
        foo: 'bar',
      },
    });

    app.mockCsrf();
    return app.httpRequest()
      .post('/user')
      .send({
        hi: 'body',
        a: 123,
      })
      .expect(200)
      .expect({
        params: {
          hi: 'body',
          a: 123,
        },
        user: {
          foo: 'bar',
        },
      });
  });

  it('should work on POST file with user login', async () => {
    const ctx = app.mockContext({
      user: {
        foo: 'bar',
      },
      traceId: `trace-${Date.now}`,
    });
    // assert(ctx.user.foo === 'bar');
    const ctxFromStorage = app.ctxStorage.getStore();
    assert(ctxFromStorage === ctx);
    assert(app.currentContext === ctx);

    app.mockCsrf();
    await app.httpRequest()
      .post('/file')
      .field('title', 'file title')
      .attach('file', getFixtures('../../package.json'))
      .expect(200)
      .expect({
        fields: {
          title: 'file title',
        },
        filename: 'package.json',
        user: {
          foo: 'bar',
        },
        traceId: ctx.traceId,
        ctxFromStorageUser: ctxFromStorage.user,
        ctxFromStorageTraceId: ctxFromStorage.traceId,
      });
    const ctxFromStorage2 = app.ctxStorage.getStore();
    assert(ctxFromStorage2 === ctx);
    mm.restore();
    const ctxFromStorage3 = app.ctxStorage.getStore();
    assert(!ctxFromStorage3);
    assert(!app.currentContext);
  });
});
