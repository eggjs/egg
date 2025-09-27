import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';
import snapshot from 'snap-shot-it';

describe('test/context.test.ts', () => {
  afterEach(mm.restore);

  describe('context.isSafeDomain', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir: 'apps/isSafeDomain-custom',
      });
      return app.ready();
    });

    after(() => app.close());

    it('should return false when domains are not safe', async () => {
      snapshot(app.config.security);
      const res = await app.httpRequest().get('/unsafe').set('accept', 'text/html').expect(200);
      assert.equal(res.text, 'false');
    });

    it('should return true when domains are safe', async () => {
      const res = await app.httpRequest().get('/safe').set('accept', 'text/html').expect(200);
      assert.equal(res.text, 'true');
    });
  });
});
