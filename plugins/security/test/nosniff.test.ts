import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/nosniff.test.ts', () => {
  let app: MockApplication;

  before(async () => {
    app = mm.app({
      baseDir: 'apps/nosniff',
    });
    await app.ready();
  });

  after(() => app.close());

  afterEach(mm.restore);

  it('should return default no-sniff http header', async () => {
    await app.httpRequest().get('/').set('accept', 'text/html').expect('X-Content-Type-Options', 'nosniff').expect(200);
  });

  it('should not return download noopen http header', async () => {
    await app
      .httpRequest()
      .get('/disable')
      .set('accept', 'text/html')
      .expect(res => assert(!res.headers['x-content-type-options']))
      .expect(200);
  });

  it('should disable nosniff on redirect 302', async () => {
    await app
      .httpRequest()
      .get('/redirect')
      .expect(res => assert(!res.headers['x-content-type-options']))
      .expect('location', '/')
      .expect(302);
  });

  it('should disable nosniff on redirect 301', () => {
    return app
      .httpRequest()
      .get('/redirect301')
      .expect(res => assert(!res.headers['x-content-type-options']))
      .expect('location', '/')
      .expect(301);
  });

  it('should disable nosniff on redirect 307', () => {
    return app
      .httpRequest()
      .get('/redirect307')
      .expect(res => assert(!res.headers['x-content-type-options']))
      .expect('location', '/')
      .expect(307);
  });
});
