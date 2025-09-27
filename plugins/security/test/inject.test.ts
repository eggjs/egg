import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/inject.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.app({
      baseDir: 'apps/inject',
    });
    return app.ready();
  });

  after(() => app.close());

  afterEach(mm.restore);

  describe('csrfInject', () => {
    it('should support inject csrf', async () => {
      const res = await app.httpRequest().get('/testcsrf').expect(200);
      assert.equal(res.text, '<form>\r\n<input type="hidden" name="_csrf" value="{{ctx.csrf}}" /></form>');
    });

    it('should not inject csrf when user write a csrf hidden area', async () => {
      const res = await app.httpRequest().get('/testcsrf2').expect(200);
      assert.equal(res.text, '<form><input type="hidden" name="_csrf" value="{{ctx.csrf}}"></form>');
    });
    it('should not inject csrf when user write a csrf hidden area within a single dot area', async () => {
      const res = await app.httpRequest().get('/testcsrf3').expect(200);
      assert.equal(res.text, '<form><input type="hidden" name=\'_csrf\' value="{{ctx.csrf}}"></form>');
    });
  });

  describe('nonceInject', () => {
    it('should inject nonce', async () => {
      const res = await app.httpRequest().get('/testnonce').expect(200);
      const body = res.text;
      const parts = body.split('|');
      const expectedNonce = parts[0];
      const scriptTag = parts[1];
      assert.equal(
        scriptTag,
        `<script nonce="${expectedNonce}"></script><script nonce="${expectedNonce}"></script><script nonce="${expectedNonce}"></script><script nonce="${expectedNonce}"></script><script nonce="${expectedNonce}"></script><script nonce="${expectedNonce}"></script>`
      );
    });

    it('should not inject nonce when existed', async () => {
      const res = await app.httpRequest().get('/testnonce2').expect(200);
      assert.equal(res.text, '<script nonce="{{ctx.nonce}}"></script><script nonce="{{ctx.nonce}}"></script>');
    });
  });

  describe('IspInjectDefence', function () {
    it('should inject IspInjectDefence', async () => {
      const res = await app.httpRequest().get('/testispInjection').expect(200);
      assert.equal(
        res.text,
        '<!--for injection--><!--<script>document.write("haha250")</script></html>--><!--for injection-->\n  <html>\n  <head>\n      <title></title>\n  </head>\n  <body>\n\n  </body>\n  </html>\n<!--for injection--><!--</html>--><!--for injection-->'
      );
    });
  });

  describe('work with view', function () {
    it('should successful render with csrf&nonce', async () => {
      const res = await app.httpRequest().get('/testrender').expect(200);
      const body = res.text;
      const header = res.headers['content-security-policy'];
      const csrf = res.headers['x-csrf'];
      const re_nonce = /nonce-([^']+)/;
      const nonce = header.match(re_nonce)![1];
      assert(body.includes(nonce));
      assert(body.includes(csrf));
    });
  });
});
