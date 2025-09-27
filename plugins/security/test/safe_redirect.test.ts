import { mm, MockApplication } from '@eggjs/mock';

describe('test/safe_redirect.test.ts', () => {
  let app: MockApplication;
  let app2: MockApplication;
  before(async () => {
    app = mm.app({
      baseDir: 'apps/safe_redirect',
    });
    await app.ready();
    app2 = mm.app({
      baseDir: 'apps/safe_redirect_noconfig',
    });
    await app2.ready();
  });

  after(async () => {
    await app.close();
    await app2.close();
  });

  afterEach(mm.restore);

  it('should redirect to / when url is in white list', async () => {
    await app
      .httpRequest()
      .get('/safe_redirect?goto=http://domain.com')
      .expect(302)
      .expect('location', 'http://domain.com/');
  });

  it('should redirect to / when white list is blank', async () => {
    await app2
      .httpRequest()
      .get('/safe_redirect?goto=http://domain.com')
      .expect(302)
      .expect('location', 'http://domain.com/');

    await app2
      .httpRequest()
      .get('/safe_redirect?goto=http://baidu.com')
      .expect(302)
      .expect('location', 'http://baidu.com/');
  });

  it('should redirect to / when url is invaild', async () => {
    app.mm(process.env, 'NODE_ENV', 'production');
    await app.httpRequest().get('/safe_redirect?goto=http://baidu.com').expect(302).expect('location', '/');

    await app
      .httpRequest()
      .get('/safe_redirect?goto=' + encodeURIComponent('http://domain.com.baidu.com/domain.com'))
      .expect(302)
      .expect('location', '/');

    await app.httpRequest().get('/safe_redirect?goto=https://x.yahoo.com').expect(302).expect('location', '/');
  });

  it('should redirect to / when url is baidu.com', async () => {
    app.mm(process.env, 'NODE_ENV', 'production');
    await app.httpRequest().get('/safe_redirect?goto=baidu.com').expect(302).expect('location', '/');
  });

  it('should redirect to not safe url throw error on not production', async () => {
    app.mm(process.env, 'NODE_ENV', 'dev');
    await app
      .httpRequest()
      .get('/safe_redirect?goto=http://baidu.com')
      .expect(/redirection is prohibited./)
      .expect(500);
  });

  it('should redirect path directly', async () => {
    await app.httpRequest().get('/safe_redirect?goto=/').expect(302).expect('location', '/');

    await app.httpRequest().get('/safe_redirect?goto=/foo/bar/').expect(302).expect('location', '/foo/bar/');
  });

  describe('black and white urls', () => {
    const blackurls = [
      '//baidu.com',
      '///baidu.com/',
      'xxx://baidu.com',
      'ftp://baidu.com/',
      'http://www.baidu.com?',
      'http://www.baidu.com#',
      'http://www.baidu.com%3F',
      'http://www.domain.com@www.baidu.com',
      '//www.domain.com',
      '////////www.domain.com',
      'http://hackdomain.com',
      'http://domain.com.fish.com',
      'http://www.domain.com.fish.com',
      '',
      '    ',
      '//foo',
      'http://baidu.com/123123\r\nHEADER',
      '',
      'http:///123',
    ];

    const whiteurls = ['http://domain.com/', 'http://domain.com/foo', 'http://domain.com/foo/bar?a=123'];

    it('should block', async () => {
      app.mm(process.env, 'NODE_ENV', 'production');
      for (const url of blackurls) {
        await app
          .httpRequest()
          .get('/safe_redirect?goto=' + encodeURIComponent(url))
          .expect('location', '/')
          .expect(302);
      }
    });

    it('should block evil path', async () => {
      app.mm(process.env, 'NODE_ENV', 'production');

      await app
        .httpRequest()
        .get('/safe_redirect?goto=' + encodeURIComponent('/\\evil.com/'))
        .expect('location', '/')
        .expect(302);
    });

    it('should block illegal url', async () => {
      app.mm(process.env, 'NODE_ENV', 'production');
      await app
        .httpRequest()
        .get('/safe_redirect?goto=' + encodeURIComponent('http://domain.com%0a.cn/path?abc=bar#123'))
        .expect(302)
        .expect('location', '/');
    });

    it('should block evil url', async () => {
      app.mm(process.env, 'NODE_ENV', 'production');
      await app
        .httpRequest()
        .get('/safe_redirect?goto=' + encodeURIComponent('http://domain.com!.a.cn/path?abc=bar#123'))
        .expect(302)
        .expect('location', '/');
    });

    it('should pass', async () => {
      for (const url of whiteurls) {
        await app
          .httpRequest()
          .get('/safe_redirect?goto=' + encodeURIComponent(url))
          .expect('location', url)
          .expect(302);
      }
    });
  });

  describe('unsafeRedirect()', () => {
    it('should redirect to unsafe url', async () => {
      const urls = ['http://baidu.com/', 'http://xxx.oo.com/123.html'];
      for (const url of urls) {
        await app
          .httpRequest()
          .get('/unsafe_redirect?goto=' + encodeURIComponent(url))
          .expect(302)
          .expect('location', url);
      }
    });
  });
});
