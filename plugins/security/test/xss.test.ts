import { mm, MockApplication } from '@eggjs/mock';
import snapshot from 'snap-shot-it';

describe('test/xss.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;
  let app3: MockApplication;

  before(async () => {
    app = mm.app({
      baseDir: 'apps/xss',
    });
    await app.ready();

    app2 = mm.app({
      baseDir: 'apps/xss-close',
    });
    await app2.ready();

    app3 = mm.app({
      baseDir: 'apps/xss-close-zero',
    });
    await app3.ready();
  });

  after(async () => {
    await app.close();
    await app2.close();
    await app3.close();
  });

  afterEach(mm.restore);

  it('should contain default X-XSS-Protection header', () => {
    return app
      .httpRequest()
      .get('/')
      .set('accept', 'text/html')
      .expect('X-XSS-Protection', '1; mode=block')
      .expect(200);
  });

  it('should set X-XSS-Protection header value 0 by this.securityOptions', () => {
    return app.httpRequest().get('/0').set('accept', 'text/html').expect('X-XSS-Protection', '0').expect(200);
  });

  it('should set X-XSS-Protection header value 0', () => {
    return app2.httpRequest().get('/').set('accept', 'text/html').expect('X-XSS-Protection', '0').expect(200);
  });

  it('should set X-XSS-Protection header value 0 when config is number 0', () => {
    snapshot(app3.config.security.xssProtection);
    return app3.httpRequest().get('/').set('accept', 'text/html').expect('X-XSS-Protection', '0').expect(200);
  });
});
