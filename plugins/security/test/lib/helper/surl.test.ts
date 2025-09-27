import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/lib/helper/surl.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;

  before(async () => {
    app = mm.app({
      baseDir: 'apps/helper-app',
    });
    await app.ready();
  });

  before(async () => {
    app2 = mm.app({
      baseDir: 'apps/helper-app-surlextend',
    });
    await app2.ready();
  });

  afterEach(mm.restore);

  after(async () => {
    await app.close();
    await app2.close();
  });

  it('should ignore hostname without protocol', () => {
    const ctx = app.mockContext();
    assert.equal(ctx.helper.surl('foo.com'), '');
  });

  it('should support white protocol', () => {
    const ctx = app.mockContext();
    assert.equal(ctx.helper.surl('http://foo.com/javascript:alert(/XSS/)'), 'http://foo.com/javascript:alert(/XSS/)');
    assert.equal(ctx.helper.surl('https://foo.com/'), 'https://foo.com/');
    assert.equal(ctx.helper.surl('https://foo.com/>'), 'https://foo.com/&gt;');
    assert.equal(ctx.helper.surl('file://foo.com/'), 'file://foo.com/');
    assert.equal(ctx.helper.surl('file://fo<o.com/'), 'file://fo&lt;o.com/');
    assert.equal(ctx.helper.surl('data://foo.com/'), 'data://foo.com/');
    assert.equal(ctx.helper.surl('//foo.com/'), '//foo.com/');
    assert.equal(ctx.helper.surl('/////foo.com/'), '/////foo.com/');
    assert.equal(ctx.helper.surl('/////"foo.com/'), '/////&quot;foo.com/');
    assert.equal(ctx.helper.surl('/XXX/xxx.htm'), '/XXX/xxx.htm');
    assert.equal(ctx.helper.surl("/XXX/'xxx.htm"), '/XXX/&#x27;xxx.htm');
  });

  it('should convert to empty string when protocol invalid', () => {
    const ctx = app.mockContext();
    assert.equal(ctx.helper.surl(123), 123);
    assert.equal(ctx.helper.surl(true), true);
    assert.equal(ctx.helper.surl('datad://foo.com'), '');
    assert.equal(ctx.helper.surl('javascript1://foo.com'), '');
    /* eslint-disable no-script-url */
    assert.equal(ctx.helper.surl('javascript:alert(/XSS/)'), '');
    assert.equal(ctx.helper.surl('xxx://xss.com'), '');
    assert.equal(ctx.helper.surl('://xss.com'), '');
    assert.equal(ctx.helper.surl('xss.com'), '');
    assert.equal(ctx.helper.surl('    '), '');
    assert.equal(ctx.helper.surl('   <s> '), '');
    assert.equal(ctx.helper.surl('\\\\   <s> '), '');
    assert.equal(
      ctx.helper.surl(
        '\'"></script><script/src=http://lxy.pw/04ZI2u?507706></script>&bgPicUrl=https://cdn.com/images/giftprod/T1_GNfXfxXXXXXXXXX39e6601453bedfa5afee114ae1fa9bdd&_network=wifi&ttid=201200@laiwang_iphone_5.5.2'
      ),
      ''
    );
  });

  it('should support custom white protocol', () => {
    const ctx = app2.mockContext();
    assert.equal(ctx.helper.surl('test://foo.com'), 'test://foo.com');
  });
});
