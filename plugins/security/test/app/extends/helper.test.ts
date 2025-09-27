import { strict as assert } from 'node:assert';
import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, describe, it } from 'vitest';

import { getFixtures } from '../../utils.ts';

describe('test/app/extends/helper.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;
  let app3: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/helper-app'),
    });
    await app.ready();

    app2 = mm.app({
      baseDir: getFixtures('apps/helper-config-app'),
    });
    await app2.ready();

    app3 = mm.app({
      baseDir: getFixtures('apps/helper-link-app'),
    });
    await app3.ready();
  });

  afterAll(async () => {
    await app.close();
    await app2.close();
    await app3.close();
  });

  describe('helper.escape()', () => {
    it('should work', () => {
      return app.httpRequest().get('/escape').expect(200).expect('true');
    });
  });

  describe('helper.shtml()', () => {
    it('should basic usage work', () => {
      return app.httpRequest().get('/shtml-basic').expect(200).expect('true');
    });

    it('should escape tag not in default whitelist', () => {
      return app.httpRequest().get('/shtml-escape-tag-not-in-default-whitelist').expect(200).expect('true');
    });

    it('should support multiple filter', () => {
      return app.httpRequest().get('/shtml-multiple-filter').expect(200).expect('true');
    });

    it('should escape script', () => {
      return app.httpRequest().get('/shtml-escape-script').expect(200).expect('true');
    });

    it('should escape img onload', () => {
      return app.httpRequest().get('/shtml-escape-img-onload').expect(200).expect('true');
    });

    it('should escape hostname null', () => {
      return app.httpRequest().get('/shtml-escape-hostname-null').expect(200).expect('true');
    });

    it('should support configuration', () => {
      return app2.httpRequest().get('/shtml-configuration').expect(200).expect('true');
    });

    it('should ignore domains not in default domainList', () => {
      return app.httpRequest().get('/shtml-ignore-domains-not-in-default-domainList').expect(200).expect('true');
    });

    it('should ignore hash', () => {
      return app3.httpRequest().get('/shtml-ignore-hash').expect(200).expect('true');
    });

    it('should support extending domainList via config.helper.shtml.domainWhiteList', () => {
      return app2
        .httpRequest()
        .get('/shtml-extending-domainList-via-config.helper.shtml.domainWhiteList')
        .expect(200)
        .expect('true');
    });

    it('should support absolute path', () => {
      return app.httpRequest().get('/shtml-absolute-path').expect(200).expect('true');
    });

    it('should stripe css url', () => {
      return app2.httpRequest().get('/shtml-stripe-css-url').expect(200).expect('true');
    });

    it('should customize whitelist via this.securityOptions.shtml', () => {
      return app.httpRequest().get('/shtml-custom-via-security-options').expect(200).expect('true');
    });

    it('should check securityOptions when call shtml directly', () => {
      const ctx = app.mockContext();
      assert.equal(ctx.helper.shtml('<div></div>'), '<div></div>');
    });
  });

  describe('helper.sjs()', () => {
    it('should sjs(foo) work', () => {
      return app.httpRequest().get('/sjs').expect(200).expect('true');
    });

    it('should convert special chars on js context', () => {
      return app.httpRequest().get('/sjs-2').expect(200).expect('true');
    });
  });
});
