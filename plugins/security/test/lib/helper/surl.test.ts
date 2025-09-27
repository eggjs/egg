import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { getFixtures } from '../../utils.ts';

describe('test/lib/helper/surl.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/helper-app'),
    });
    await app.ready();
    app2 = mm.app({
      baseDir: getFixtures('apps/helper-app-surlextend'),
    });
    await app2.ready();
  });

  afterAll(async () => {
    await app.close();
    await app2.close();
  });

  it('should ignore hostname without protocol', () => {
    const ctx = app.mockContext();
    expect(ctx.helper.surl('foo.com')).toBe('');
  });

  it('should support white protocol', () => {
    const ctx = app.mockContext();
    expect(ctx.helper.surl('http://foo.com/javascript:alert(/XSS/)')).toBe('http://foo.com/javascript:alert(/XSS/)');
    expect(ctx.helper.surl('https://foo.com/')).toBe('https://foo.com/');
    expect(ctx.helper.surl('https://foo.com/>')).toBe('https://foo.com/&gt;');
    expect(ctx.helper.surl('file://foo.com/')).toBe('file://foo.com/');
    expect(ctx.helper.surl('file://fo<o.com/')).toBe('file://fo&lt;o.com/');
    expect(ctx.helper.surl('data://foo.com/')).toBe('data://foo.com/');
    expect(ctx.helper.surl('//foo.com/')).toBe('//foo.com/');
    expect(ctx.helper.surl('/////foo.com/')).toBe('/////foo.com/');
    expect(ctx.helper.surl('/////"foo.com/')).toBe('/////&quot;foo.com/');
    expect(ctx.helper.surl('/XXX/xxx.htm')).toBe('/XXX/xxx.htm');
    expect(ctx.helper.surl("/XXX/'xxx.htm")).toBe('/XXX/&#x27;xxx.htm');
  });

  it('should convert to empty string when protocol invalid', () => {
    const ctx = app.mockContext();
    expect(ctx.helper.surl(123)).toBe(123);
    expect(ctx.helper.surl(true)).toBe(true);
    expect(ctx.helper.surl('datad://foo.com')).toBe('');
    expect(ctx.helper.surl('javascript1://foo.com')).toBe('');
    /* eslint-disable no-script-url */
    expect(ctx.helper.surl('javascript:alert(/XSS/)')).toBe('');
    expect(ctx.helper.surl('xxx://xss.com')).toBe('');
    expect(ctx.helper.surl('://xss.com')).toBe('');
    expect(ctx.helper.surl('xss.com')).toBe('');
    expect(ctx.helper.surl('    ')).toBe('');
    expect(ctx.helper.surl('   <s> ')).toBe('');
    expect(ctx.helper.surl('\\\\   <s> ')).toBe('');
    expect(
      ctx.helper.surl(
        '\'"></script><script/src=http://lxy.pw/04ZI2u?507706></script>&bgPicUrl=https://cdn.com/images/giftprod/T1_GNfXfxXXXXXXXXX39e6601453bedfa5afee114ae1fa9bdd&_network=wifi&ttid=201200@laiwang_iphone_5.5.2'
      )
    ).toBe('');
  });

  it('should support custom white protocol', () => {
    const ctx = app2.mockContext();
    expect(ctx.helper.surl('test://foo.com')).toBe('test://foo.com');
  });
});
