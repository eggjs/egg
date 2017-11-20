'use strict';

const mm = require('egg-mock');
const utils = require('../../utils');

describe('test/app/middleware/notfound.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/notfound');
    return app.ready();
  });
  after(() => app.close());

  afterEach(mm.restore);

  it('should 302 redirect to 404.html', () => {
    return app.httpRequest()
      .get('/test/404')
      .set('Accept', 'test/html')
      .expect('Location', 'https://eggjs.org/404')
      .expect(302);
  });

  it('should 404 json response', () => {
    return app.httpRequest()
      .get('/test/404.json?ctoken=404')
      .set('Cookie', 'ctoken=404')
      .expect({
        message: 'Not Found',
      })
      .expect(404);
  });

  it('should 404 json response on rest api', () => {
    return app.httpRequest()
      .get('/api/404.json?ctoken=404')
      .set('Cookie', 'ctoken=404')
      .expect({
        message: 'Not Found',
      })
      .expect(404);
  });

  it('should show 404 page content when antx notfound.pageUrl not set', () => {
    mm(app.config.notfound, 'pageUrl', '');
    return app.httpRequest()
      .get('/foo')
      .expect('<h1>404 Not Found</h1>')
      .expect(404);
  });

  describe('config.notfound.pageUrl = "/404"', () => {
    let app;
    before(() => {
      app = utils.app('apps/notfound-custom-404');
      return app.ready();
    });
    after(() => app.close());

    afterEach(mm.restore);

    it('should 302 redirect to custom /404 when required html', async () => {
      await app.httpRequest()
        .get('/test/404')
        .set('Accept', 'test/html')
        .expect('Location', '/404')
        .expect(302);

      await app.httpRequest()
        .get('/404')
        .expect('Hi, this is 404')
        .expect(200);
    });

    it('should not avoid circular redirects', async () => {
      mm(app.config.notfound, 'pageUrl', '/notfound');

      await app.httpRequest()
        .get('/test/404')
        .set('Accept', 'test/html')
        .expect('Location', '/notfound')
        .expect(302);

      await app.httpRequest()
        .get('/notfound')
        .expect('<h1>404 Not Found</h1><p><pre><code>config.notfound.pageUrl(/notfound)</code></pre> is unimplemented</p>')
        .expect(404);
    });
  });
});
