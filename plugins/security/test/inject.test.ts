import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/inject.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/inject'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  describe('csrfInject', () => {
    it('should support inject csrf', async () => {
      const res = await app.httpRequest().get('/testcsrf').expect(200);
      expect(res.text).toBe('<form>\r\n<input type="hidden" name="_csrf" value="{{ctx.csrf}}" /></form>');
    });

    it('should not inject csrf when user write a csrf hidden area', async () => {
      const res = await app.httpRequest().get('/testcsrf2').expect(200);
      expect(res.text).toBe('<form><input type="hidden" name="_csrf" value="{{ctx.csrf}}"></form>');
    });
    it('should not inject csrf when user write a csrf hidden area within a single dot area', async () => {
      const res = await app.httpRequest().get('/testcsrf3').expect(200);
      expect(res.text).toBe('<form><input type="hidden" name=\'_csrf\' value="{{ctx.csrf}}"></form>');
    });
  });

  describe('nonceInject', () => {
    it('should inject nonce', async () => {
      const res = await app.httpRequest().get('/testnonce').expect(200);
      const body = res.text;
      const parts = body.split('|');
      const expectedNonce = parts[0];
      const scriptTag = parts[1];
      expect(scriptTag).toBe(
        `<script nonce="${expectedNonce}"></script><script nonce="${expectedNonce}"></script><script nonce="${expectedNonce}"></script><script nonce="${expectedNonce}"></script><script nonce="${expectedNonce}"></script><script nonce="${expectedNonce}"></script>`
      );
    });

    it('should not inject nonce when existed', async () => {
      const res = await app.httpRequest().get('/testnonce2').expect(200);
      expect(res.text).toBe('<script nonce="{{ctx.nonce}}"></script><script nonce="{{ctx.nonce}}"></script>');
    });
  });

  describe('IspInjectDefence', () => {
    it('should inject IspInjectDefence', async () => {
      const res = await app.httpRequest().get('/testispInjection').expect(200);
      expect(res.text).toBe(
        '<!--for injection--><!--<script>document.write("haha250")</script></html>--><!--for injection-->\n  <html>\n  <head>\n      <title></title>\n  </head>\n  <body>\n\n  </body>\n  </html>\n<!--for injection--><!--</html>--><!--for injection-->'
      );
    });
  });

  describe('work with view', () => {
    it('should successful render with csrf&nonce', async () => {
      const res = await app.httpRequest().get('/testrender').expect(200);
      const body = res.text;
      const header = res.headers['content-security-policy'];
      const csrf = res.headers['x-csrf'];
      const re_nonce = /nonce-([^']+)/;
      const nonce = header.match(re_nonce)![1];
      expect(body).toContain(nonce);
      expect(body).toContain(csrf);
    });
  });
});
