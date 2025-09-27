import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';
import snapshot from 'snap-shot-it';

describe('test/csp.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;
  let app3: MockApplication;
  let app4: MockApplication;
  before(async () => {
    app = mm.app({
      baseDir: 'apps/csp',
    });
    await app.ready();
    app2 = mm.app({
      baseDir: 'apps/csp-ignore',
    });
    await app2.ready();
    app3 = mm.app({
      baseDir: 'apps/csp-reportonly',
    });
    await app3.ready();
    app4 = mm.app({
      baseDir: 'apps/csp-supportie',
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

  describe('directives', () => {
    it('should support other directives when pattern match', async () => {
      const res = await app.httpRequest().get('/testcsp').expect(200);
      const nonce = res.text;
      const expectedHeader =
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.domain.com www.google-analytics.com 'nonce-" +
        nonce +
        "';style-src 'unsafe-inline' *.domain.com;img-src 'self' data: *.domain.com www.google-analytics.com;frame-ancestors 'self';report-uri http://pointman.domain.com/csp?app=csp";
      assert.equal(res.headers['content-security-policy'], expectedHeader);
    });

    it('should support with custom policy', async () => {
      const res = await app.httpRequest().get('/testcsp/custom').expect(200);
      const nonce = res.text;
      const expectedHeader = `script-src 'self' 'nonce-${nonce}';style-src 'unsafe-inline';img-src 'self';frame-ancestors 'self';report-uri http://pointman.domain.com/csp?app=csp`;
      assert.equal(res.headers['content-security-policy'], expectedHeader);
    });

    it('should support dynamic disable', async () => {
      const res = await app.httpRequest().get('/testcsp/disable').expect(200);
      assert.equal(res.headers['content-security-policy'], undefined);
    });

    it('should support IE', async () => {
      const res = await app4
        .httpRequest()
        .get('/testcsp')
        .set('user-agent', 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; Trident/4.0)')
        .expect(200);
      const nonce = res.text;
      const expectedHeader =
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.domain.com www.google-analytics.com 'nonce-" +
        nonce +
        "';style-src 'unsafe-inline' *.domain.com;img-src 'self' data: *.domain.com www.google-analytics.com;frame-ancestors 'self';report-uri http://pointman.domain.com/csp?app=csp";
      assert.equal(res.headers['x-content-security-policy'], expectedHeader);
    });

    it('should support report-uri', async () => {
      const res = await app.httpRequest().get('/testcsp').expect(200);
      const headers = JSON.stringify(res.headers);
      assert.match(headers, /report-uri http:\/\/pointman\.domain\.com\/csp\?app=csp/);
    });
  });

  describe('nonce', () => {
    it('should support nonce', async () => {
      const res = await app.httpRequest().get('/testcsp').expect(200);
      const nonce = res.text;
      const header = res.headers['content-security-policy'];
      const re_nonce = /nonce-([^']+)/;
      const m = re_nonce.exec(header);
      assert.equal(nonce, m![1], header);
    });

    it('should have X-CSP-Nonce header', async () => {
      const res = await app.httpRequest().get('/testcsp').expect(200);
      const nonce = res.text;
      assert.equal(res.headers['x-csp-nonce'], nonce);
    });
  });

  it('should ignore path', async () => {
    snapshot(app2.config.security);
    const res = await app2.httpRequest().get('/api/update').expect(200);
    assert.equal(res.headers['x-csp-nonce'], undefined);
  });

  it('should ignore path by regex rule', async () => {
    const res = await app2.httpRequest().get('/ignore/update').expect(200);
    assert.equal(res.headers['x-csp-nonce'], undefined);
  });

  it('should not ignore path when do not match', async () => {
    const res = await app2.httpRequest().get('/testcsp').expect(200);
    assert(res.headers['x-csp-nonce']);
  });

  it('should support report only when pattern match and report only config open', async () => {
    const res = await app3.httpRequest().get('/testcsp').expect(200);
    const nonce = res.text;
    const expectedHeader =
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.domain.com www.google-analytics.com 'nonce-" +
      nonce +
      "';style-src 'unsafe-inline' *.domain.com;img-src 'self' data: *.domain.com www.google-analytics.com;frame-ancestors 'self';report-uri http://pointman.domain.com/csp?app=csp";
    assert.equal(res.headers['content-security-policy-report-only'], expectedHeader);
  });

  it('should support report only when pattern match and report only config open and support ie', async () => {
    const res = await app3
      .httpRequest()
      .get('/testcsp2')
      .set('user-agent', 'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.0; Trident/4.0)')
      .expect(200);
    const nonce = res.text;
    const expectedHeader =
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.domain.com www.google-analytics.com 'nonce-" +
      nonce +
      "';style-src 'unsafe-inline' *.domain.com;img-src 'self' data: *.domain.com www.google-analytics.com;frame-ancestors 'self';report-uri http://pointman.domain.com/csp?app=csp";
    assert.equal(res.headers['x-content-security-policy-report-only'], expectedHeader);
  });
});
