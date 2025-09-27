import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/security.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;
  let app3: MockApplication;
  let app4: MockApplication;
  before(async () => {
    app = mm.app({
      baseDir: 'apps/security',
    });
    await app.ready();
    app2 = mm.app({
      baseDir: 'apps/security-unset',
    });
    await app2.ready();
    app3 = mm.app({
      baseDir: 'apps/security-override-controller',
    });
    await app3.ready();
    app4 = mm.app({
      baseDir: 'apps/security-override-middleware',
    });
    await app4.ready();
  });

  after(async () => {
    await app.close();
    await app2.close();
    await app3.close();
    await app4.close();
  });

  afterEach(mm.restore);

  it('should load default security headers', () => {
    return app
      .httpRequest()
      .get('/')
      .set('accept', 'text/html')
      .expect('X-Download-Options', 'noopen')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('X-XSS-Protection', '1; mode=block')
      .expect(200);
  });

  it('should load default security headers when developer try to override in controller', () => {
    return app3
      .httpRequest()
      .get('/')
      .set('accept', 'text/html')
      .expect('Strict-Transport-Security', 'max-age=31536000')
      .expect('X-Download-Options', 'noopen')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('X-XSS-Protection', '1; mode=block')
      .expect(200);
  });

  it('should load default security headers when developer try to override in middleware', async () => {
    const res = await app4
      .httpRequest()
      .get('/')
      .set('accept', 'text/html')
      .expect('Strict-Transport-Security', 'max-age=31536000')
      .expect('X-Download-Options', 'noopen')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('X-XSS-Protection', '1; mode=block')
      .expect(200);
    assert.equal(res.status, 200);
  });

  it('disable hsts for default', async () => {
    const res = await app2.httpRequest().get('/').set('accept', 'text/html');
    assert.equal(res.headers['strict-transport-security'], undefined);
  });

  it('should not load security headers when set to enable:false', async () => {
    const res = await app2.httpRequest().get('/').set('accept', 'text/html');
    assert.equal(res.headers['X-Frame-Options'], undefined);
  });
});
