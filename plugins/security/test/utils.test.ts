import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';
import * as utils from '../src/lib/utils.js';

describe('test/utils.test.ts', () => {
  afterEach(mm.restore);
  describe('utils.isSafeDomain', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir: 'apps/isSafeDomain',
      });
      return app.ready();
    });

    after(() => app.close());

    const domainWhiteList = ['.domain.com', '*.alibaba.com', 'http://www.baidu.com', '192.*.0.*', 'foo.bar'];
    it('should return false when domains are not safe', async () => {
      const res = await app.httpRequest().get('/').set('accept', 'text/html').expect(200);
      assert(res.text === 'false');
    });

    it('should return true when domains are safe', async () => {
      const res = await app.httpRequest().get('/safe').set('accept', 'text/html').expect(200);
      assert(res.text === 'true');
    });

    it('should return true', () => {
      assert(utils.isSafeDomain('domain.com', domainWhiteList) === true);
      assert(utils.isSafeDomain('.domain.com', domainWhiteList) === true);
      assert(utils.isSafeDomain('foo.domain.com', domainWhiteList) === true);
      assert(utils.isSafeDomain('.foo.domain.com', domainWhiteList) === true);
      assert(utils.isSafeDomain('.....domain.com', domainWhiteList) === true);
      assert(utils.isSafeDomain('okokok----.domain.com', domainWhiteList) === true);

      // Wild Cast check
      assert(utils.isSafeDomain('www.alibaba.com', domainWhiteList) === true);
      assert(utils.isSafeDomain('www.tianmao.alibaba.com', domainWhiteList) === true);
      assert(utils.isSafeDomain('www.tianmao.AlIBAba.COm', domainWhiteList) === true);
      assert(utils.isSafeDomain('http://www.baidu.com', domainWhiteList) === true);
      assert(utils.isSafeDomain('192.168.0.255', domainWhiteList) === true);
      assert(utils.isSafeDomain('foo.bar', domainWhiteList) === true);
    });

    it('should return false', () => {
      assert(utils.isSafeDomain('', domainWhiteList) === false);
      assert((utils as any).isSafeDomain(undefined, domainWhiteList) === false);
      assert((utils as any).isSafeDomain(null, domainWhiteList) === false);
      assert((utils as any).isSafeDomain(0, domainWhiteList) === false);
      assert((utils as any).isSafeDomain(1, domainWhiteList) === false);
      assert((utils as any).isSafeDomain({}, domainWhiteList) === false);
      assert((utils as any).isSafeDomain(function () {}, domainWhiteList) === false);
      assert(utils.isSafeDomain('aaa-domain.com', domainWhiteList) === false);
      assert(utils.isSafeDomain(' domain.com', domainWhiteList) === false);
      assert(utils.isSafeDomain('pwd---.-domain.com', domainWhiteList) === false);
      assert(utils.isSafeDomain('ok. domain.com', domainWhiteList) === false);

      // Wild Cast check
      assert(utils.isSafeDomain('www.alibaba.com.cn', domainWhiteList) === false);
      assert(utils.isSafeDomain('www.tianmao.alibab.com', domainWhiteList) === false);
      assert(utils.isSafeDomain('http://www.baidu.com/zh-CN', domainWhiteList) === false);
      assert(utils.isSafeDomain('192.168.1.255', domainWhiteList) === false);
      assert(utils.isSafeDomain('foofoo.bar', domainWhiteList) === false);
    });
  });

  describe('utils.checkIfIgnore', () => {
    let app: MockApplication;
    let app2: MockApplication;
    let app3: MockApplication;
    let app4: MockApplication;
    let app5: MockApplication;
    let app6: MockApplication;
    before(async () => {
      app = mm.app({
        baseDir: 'apps/utils-check-if-pass',
      });
      await app.ready();

      app2 = mm.app({
        baseDir: 'apps/utils-check-if-pass2',
      });
      await app2.ready();

      app3 = mm.app({
        baseDir: 'apps/utils-check-if-pass3',
      });
      await app3.ready();

      app4 = mm.app({
        baseDir: 'apps/utils-check-if-pass4',
      });
      await app4.ready();

      app5 = mm.app({
        baseDir: 'apps/utils-check-if-pass5',
      });
      await app5.ready();

      app6 = mm.app({
        baseDir: 'apps/utils-check-if-pass6',
      });
      await app6.ready();
    });

    after(async () => {
      await app.close();
      await app2.close();
      await app3.close();
      await app4.close();
      await app5.close();
      await app6.close();
    });

    it('should use match', async () => {
      const res = await app.httpRequest().get('/match').expect(200);
      assert(res.headers['x-csp-nonce'].length === 16);
    });

    it('global match should not work', async () => {
      const res = await app.httpRequest().get('/luckydrq').expect(200);
      assert(res.headers['x-csp-nonce'].length === 16);
    });

    it('own match should replace global match', async () => {
      let res = await app2.httpRequest().get('/mymatch').expect(200);
      assert(res.headers['x-csp-nonce'].length === 16);
      res = await app2.httpRequest().get('/match').expect(200);
      assert(!res.headers['x-csp-nonce']);
    });

    it('own match has priority over own ignore', async () => {
      const res = await app2.httpRequest().get('/mytrueignore').expect(200);
      assert(!res.headers['x-csp-nonce']);
    });

    it('should not use global ignore', async () => {
      const res = await app3.httpRequest().get('/ignore').expect(200);
      assert(res.headers['x-csp-nonce'].length === 16);
    });

    it('own ignore should replace global ignore', async () => {
      let res = await app4.httpRequest().get('/ignore').expect(200);
      assert(res.headers['x-csp-nonce'].length === 16);
      res = await app4.httpRequest().get('/myignore').expect(200);
      assert(!res.headers['x-csp-nonce']);
    });

    it('should ignore array work', async () => {
      let res = await app5.httpRequest().get('/ignore1').expect(200);
      assert(!res.headers['x-frame-options']);

      res = await app5.httpRequest().get('/ignore2').expect(200);
      assert(!res.headers['x-frame-options']);

      res = await app5.httpRequest().get('/').expect(200);
      assert(res.header['x-frame-options']);
    });

    it('should match array work', async () => {
      let res = await app6.httpRequest().get('/match1').expect(200);
      assert(res.headers['x-frame-options']);

      res = await app6.httpRequest().get('/match2').expect(200);
      assert(res.headers['x-frame-options']);

      res = await app6.httpRequest().get('/').expect(200);
      assert(!res.headers['x-frame-options']);
    });
  });
});
