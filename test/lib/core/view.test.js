'use strict';

const assert = require('assert');
const path = require('path');
const mock = require('egg-mock');
const utils = require('../../utils');

describe('test/lib/core/view.test.js', () => {
  afterEach(mock.restore);

  describe('multiple view engine', () => {
    const baseDir = utils.getFilepath('apps/multiple-view-engine');
    let app;
    before(() => {
      app = utils.app('apps/multiple-view-engine');
      return app.ready();
    });
    after(() => app.close());

    describe('use', () => {
      it('should register success', () => {
        class View {
          render() {}
          renderString() {}
        }
        app.view.use('e', View);
        // assert(app.view.has('e'));
      });
    });

    describe('render', () => {
      it('should render ejs', async () => {
        const res = await app.httpRequest()
          .get('/render-ejs')
          .expect(200);

        assert(res.body.filename === path.join(baseDir, 'app/view/ext/a.ejs'));
        assert(res.body.locals.data === 1);
        assert(res.body.options.opt === 1);
        assert(res.body.type === 'ejs');
      });

      it('should render nunjucks', async () => {
        const res = await app.httpRequest()
          .get('/render-nunjucks')
          .expect(200);

        assert(res.body.filename === path.join(baseDir, 'app/view/ext/a.nj'));
        assert(res.body.locals.data === 1);
        assert(res.body.options.opt === 1);
        assert(res.body.type === 'nunjucks');
      });

      it('should render with options.viewEngine', async () => {
        const res = await app.httpRequest()
          .get('/render-with-options')
          .expect(200);

        assert(res.body.filename === path.join(baseDir, 'app/view/ext/a.nj'));
        assert(res.body.type === 'ejs');
      });
    });

    describe('renderString', () => {
      it('should renderString', async () => {
        const res = await app.httpRequest()
          .get('/render-string')
          .expect(200);
        assert(res.body.tpl === 'hello world');
        assert(res.body.locals.data === 1);
        assert(res.body.options.viewEngine === 'ejs');
        assert(res.body.type === 'ejs');
      });

      it('should throw when no viewEngine', async () => {
        await app.httpRequest()
          .get('/render-string-without-view-engine')
          .expect(500);
      });
    });
  });

  describe('nunjucks view', () => {
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

    it('should render with options', function(done) {
      app.httpRequest()
        .get('/')
        .expect(200)
        .expect(res => assert.equal(String(res.text).replace(/\r/g, ''), `Hi, mk・2\ntest-app-helper: test-bar@${app.config.baseDir}\nraw: <div>dar</div>\n2014 @ mk2 &lt;br&gt;\n`))
        .end(done)

      ;
    });

    it('should render with async function controller', function(done) {
      app.httpRequest()
        .get('/async')
        .expect(200)
        .expect(res => assert.equal(String(res.text).replace(/\r/g, ''), `Hi, mk・2\ntest-app-helper: test-bar@${app.config.baseDir}\nraw: <div>dar</div>\n2014 @ mk2 &lt;br&gt;\n`))
        .end(done)
      ;
    });

    it('should render have helper instance', function(done) {
      app.httpRequest()
        .get('/')
        .expect(200, done);
    });

    it('should render with empty', function(done) {
      app.httpRequest()
        .get('/empty')
        .expect(200)
        .expect(res => assert.equal(String(res.text).replace(/\r/g, ''), `Hi, \ntest-app-helper: test-bar@${app.config.baseDir}\nraw: <div>dar</div>\n2014 @ mk2 &lt;br&gt;\n`))

        .end(done)
      ;
    });

    it('should render template string', function(done) {
      app.httpRequest()
        .get('/string')
        .expect(200)
        .expect('templateString', done);
    });
  });
});
