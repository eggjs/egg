'use strict';

const path = require('path');
const mm = require('egg-mock');
const assert = require('assert');

describe('test/view/view.test.js', () => {
  let app;

  before(function* () {
    app = mm.app({
      baseDir: 'example',
      framework: path.join(__dirname, '../fixtures/framework'),
    });
    yield app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should enable', () => {
    assert(app.nunjucks);
    assert(app.nunjucks.app);
  });

  it('should render string', function* () {
    yield app
      .httpRequest()
      .get('/string')
      .expect(200)
      .expect(/hi, egg/);
  });

  it('should render string with options path', function* () {
    yield app
      .httpRequest()
      .get('/string_options')
      .expect(200)
      .expect(/<div>egg<div>/);
  });

  it('should render template', function* () {
    yield app
      .httpRequest()
      .get('/')
      .expect(200)
      .expect(/hi, egg/);
  });

  it('should render template not found', function* () {
    yield app
      .httpRequest()
      .get('/not_found')
      .expect(500)
      .expect(/Can't find not_found.tpl from /);
  });

  it('should render error', function* () {
    yield app
      .httpRequest()
      .get('/error_string')
      .expect(500)
      .expect(/Template render error/i);
  });

  it('should inject helper/ctx/request', function* () {
    yield app
      .httpRequest()
      .get('/inject')
      .expect(200)
      .expect(/ctx: true/)
      .expect(/request: true/)
      .expect(/helper: true/)
      .expect(/helperFn: true/);
  });

  it('should load filter.js', function* () {
    yield app
      .httpRequest()
      .get('/filter')
      .expect(200)
      .expect(/hi, egg/);
  });

  it('should load filter.js with include', function* () {
    yield app
      .httpRequest()
      .get('/filter/include')
      .expect(200)
      .expect(/hi, egg/)
      .expect(/hi, yadan/);
  });

  it('should extend locals', function* () {
    yield app
      .httpRequest()
      .get('/locals')
      .expect(200)
      .expect(/app, ctx, locals/);
  });

  describe('multi-dir', () => {
    let app;
    before(() => {
      app = mm.app({
        baseDir: 'multi-dir',
        framework: path.join(__dirname, '../fixtures/framework'),
      });
      return app.ready();
    });
    after(() => app.close());

    it('should support multi-dir config', function* () {
      yield app.httpRequest().get('/view').expect(200, 'hi, egg');
      yield app.httpRequest().get('/ext').expect(200, 'hi, ext egg');
    });

    it('should include', function* () {
      yield app.httpRequest().get('/include').expect(200, 'include hi, ext egg\n');
    });

    it('should include relative', function* () {
      yield app.httpRequest().get('/relative').expect(200, 'hello egg\n');
    });

    it('should import', function* () {
      yield app.httpRequest().get('/import').expect(200, '<div>\n  <label>egg</label>\n</div>\n');
    });
  });

  describe('template', () => {
    let app;
    before(() => {
      app = mm.app({
        baseDir: 'template',
        framework: path.join(__dirname, '../fixtures/framework'),
      });
      return app.ready();
    });
    after(() => app.close());
  });
});
