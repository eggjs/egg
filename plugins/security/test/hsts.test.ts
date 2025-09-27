import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/hsts.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;
  let app3: MockApplication;
  describe('server', () => {
    before(async () => {
      app = mm.app({
        baseDir: 'apps/hsts',
      });
      await app.ready();
      app2 = mm.app({
        baseDir: 'apps/hsts-nosub',
      });
      await app2.ready();
      app3 = mm.app({
        baseDir: 'apps/hsts-default',
      });
      await app3.ready();
    });

    afterEach(mm.restore);

    after(async () => {
      await app.close();
      await app2.close();
      await app3.close();
    });

    it('should contain not Strict-Transport-Security header with default', async () => {
      const res = await app3.httpRequest().get('/').set('accept', 'text/html').expect(200);
      assert.equal(res.headers['strict-transport-security'], undefined);
    });

    it('should contain Strict-Transport-Security header when configured', () => {
      return app2
        .httpRequest()
        .get('/')
        .set('accept', 'text/html')
        .expect('Strict-Transport-Security', 'max-age=31536000')
        .expect(200);
    });

    it('should contain includeSubdomains rule when defined', () => {
      return app
        .httpRequest()
        .get('/')
        .set('accept', 'text/html')
        .expect('Strict-Transport-Security', 'max-age=31536000; includeSubdomains')
        .expect(200);
    });

    it('should not contain includeSubdomains rule with this.securityOptions', () => {
      return app
        .httpRequest()
        .get('/nosub')
        .set('accept', 'text/html')
        .expect('Strict-Transport-Security', 'max-age=31536000')
        .expect(200);
    });
  });
});
