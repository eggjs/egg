'use strict';

const request = require('supertest');
const mm = require('egg-mock');
const utils = require('../../../utils');

describe('test/lib/plugins/view/render.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/view-render');
    return app.ready();
  });
  before(() => {
    app.locals = {
      copyright: '2014 @ mk2 <br>',
    };
  });

  afterEach(mm.restore);

  it('should render with options', function(done) {
    request(app.callback())
    .get('/')
    .expect(200)
    .expect(`Hi, mk・2\ntest-app-helper: test-bar@${app.config.baseDir}\nraw: <div>dar</div>\n2014 @ mk2 &lt;br&gt;\n`, done);
  });

  it('should render with async function controller', function(done) {
    request(app.callback())
    .get('/async')
    .expect(200)
    .expect(`Hi, mk・2\ntest-app-helper: test-bar@${app.config.baseDir}\nraw: <div>dar</div>\n2014 @ mk2 &lt;br&gt;\n`, done);
  });

  it('should render have helper instance', function(done) {
    request(app.callback())
    .get('/')
    .expect(200, done);
  });

  it('should render with empty', function(done) {
    request(app.callback())
    .get('/empty')
    .expect(200)
    .expect(`Hi, \ntest-app-helper: test-bar@${app.config.baseDir}\nraw: <div>dar</div>\n2014 @ mk2 &lt;br&gt;\n`, done);
  });

  it('should render template string', function(done) {
    request(app.callback())
    .get('/string')
    .expect(200)
    .expect('templateString', done);
  });

});
