const utils = require('./utils');

describe('test/router_redos.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/app-router-redos');
    return app.ready();
  });
  after(() => app.close());

  it('should fix redos', done => {
    // https://blakeembrey.com/posts/2024-09-web-redos/
    app.httpRequest()
      .get('/flights/a' + '-'.repeat(16000) + '/x')
      // .get('/flights/f' + '-h'.repeat(8000) + '//flights/f')
      .end(done);
  });
});
