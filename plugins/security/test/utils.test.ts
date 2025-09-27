import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, expect, afterEach } from 'vitest';

import { getFixtures } from './utils.ts';
import * as utils from '../src/lib/utils.ts';

describe('utils.isSafeDomain', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/isSafeDomain'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  afterEach(mm.restore);

  const domainWhiteList = ['.domain.com', '*.alibaba.com', 'http://www.baidu.com', '192.*.0.*', 'foo.bar'];
  it('should return false when domains are not safe', async () => {
    const res = await app.httpRequest().get('/').set('accept', 'text/html').expect(200);
    expect(res.text).toBe('false');
  });

  it('should return true when domains are safe', async () => {
    const res = await app.httpRequest().get('/safe').set('accept', 'text/html').expect(200);
    expect(res.text).toBe('true');
  });

  it('should return true', () => {
    expect(utils.isSafeDomain('domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('.domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('foo.domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('.foo.domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('.....domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('okokok----.domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('.domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('foo.domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('.foo.domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('.....domain.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('okokok----.domain.com', domainWhiteList)).toBe(true);

    // Wild Cast check
    expect(utils.isSafeDomain('www.alibaba.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('www.tianmao.alibaba.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('www.tianmao.AlIBAba.COm', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('http://www.baidu.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('192.168.0.255', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('foo.bar', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('www.alibaba.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('www.tianmao.alibaba.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('www.tianmao.AlIBAba.COm', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('http://www.baidu.com', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('192.168.0.255', domainWhiteList)).toBe(true);
    expect(utils.isSafeDomain('foo.bar', domainWhiteList)).toBe(true);
  });

  it('should return false', () => {
    expect(utils.isSafeDomain('', domainWhiteList)).toBe(false);
    expect((utils as any).isSafeDomain(undefined, domainWhiteList)).toBe(false);
    expect((utils as any).isSafeDomain(null, domainWhiteList)).toBe(false);
    expect((utils as any).isSafeDomain(0, domainWhiteList)).toBe(false);
    expect((utils as any).isSafeDomain(1, domainWhiteList)).toBe(false);
    expect((utils as any).isSafeDomain({}, domainWhiteList)).toBe(false);
    expect((utils as any).isSafeDomain(function () {}, domainWhiteList)).toBe(false);
    expect(utils.isSafeDomain('aaa-domain.com', domainWhiteList)).toBe(false);
    expect(utils.isSafeDomain(' domain.com', domainWhiteList)).toBe(false);
    expect(utils.isSafeDomain('pwd---.-domain.com', domainWhiteList)).toBe(false);
    expect(utils.isSafeDomain('ok. domain.com', domainWhiteList)).toBe(false);

    // Wild Cast check
    expect(utils.isSafeDomain('www.alibaba.com.cn', domainWhiteList)).toBe(false);
    expect(utils.isSafeDomain('www.tianmao.alibab.com', domainWhiteList)).toBe(false);
    expect(utils.isSafeDomain('http://www.baidu.com/zh-CN', domainWhiteList)).toBe(false);
    expect(utils.isSafeDomain('192.168.1.255', domainWhiteList)).toBe(false);
    expect(utils.isSafeDomain('foofoo.bar', domainWhiteList)).toBe(false);
  });
});

describe.skipIf(process.platform === 'win32')('utils.checkIfIgnore', () => {
  let app: MockApplication;
  let app2: MockApplication;
  let app3: MockApplication;
  let app4: MockApplication;
  let app5: MockApplication;
  let app6: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/utils-check-if-pass'),
    });
    await app.ready();

    app2 = mm.app({
      baseDir: getFixtures('apps/utils-check-if-pass2'),
    });
    await app2.ready();

    app3 = mm.app({
      baseDir: getFixtures('apps/utils-check-if-pass3'),
    });
    await app3.ready();

    app4 = mm.app({
      baseDir: getFixtures('apps/utils-check-if-pass4'),
    });
    await app4.ready();

    app5 = mm.app({
      baseDir: getFixtures('apps/utils-check-if-pass5'),
    });
    await app5.ready();

    app6 = mm.app({
      baseDir: getFixtures('apps/utils-check-if-pass6'),
    });
    await app6.ready();
  });

  afterAll(async () => {
    await app.close();
    await app2.close();
    await app3.close();
    await app4.close();
    await app5.close();
    await app6.close();
  });

  it('should use match', async () => {
    const res = await app.httpRequest().get('/match').expect(200);
    expect(res.headers['x-csp-nonce'].length).toBe(16);
  });

  it('global match should not work', async () => {
    const res = await app.httpRequest().get('/luckydrq').expect(200);
    expect(res.headers['x-csp-nonce'].length).toBe(16);
  });

  it('own match should replace global match', async () => {
    let res = await app2.httpRequest().get('/mymatch').expect(200);
    expect(res.headers['x-csp-nonce'].length).toBe(16);
    res = await app2.httpRequest().get('/match').expect(200);
    expect(res.headers['x-csp-nonce']).toBeUndefined();
  });

  it('own match has priority over own ignore', async () => {
    const res = await app2.httpRequest().get('/mytrueignore').expect(200);
    expect(res.headers['x-csp-nonce']).toBeUndefined();
  });

  it('should not use global ignore', async () => {
    const res = await app3.httpRequest().get('/ignore').expect(200);
    expect(res.headers['x-csp-nonce'].length).toBe(16);
  });

  it('own ignore should replace global ignore', async () => {
    let res = await app4.httpRequest().get('/ignore').expect(200);
    expect(res.headers['x-csp-nonce'].length).toBe(16);
    res = await app4.httpRequest().get('/myignore').expect(200);
    expect(res.headers['x-csp-nonce']).toBeUndefined();
  });

  it('should ignore array work', async () => {
    let res = await app5.httpRequest().get('/ignore1').expect(200);
    expect(res.headers['x-frame-options']).toBeUndefined();

    res = await app5.httpRequest().get('/ignore2').expect(200);
    expect(res.headers['x-frame-options']).toBeUndefined();

    res = await app5.httpRequest().get('/').expect(200);
    expect(res.header['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('should match array work', async () => {
    let res = await app6.httpRequest().get('/match1').expect(200);
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');

    res = await app6.httpRequest().get('/match2').expect(200);
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');

    res = await app6.httpRequest().get('/').expect(200);
    expect(res.headers['x-frame-options']).toBeUndefined();
  });
});
