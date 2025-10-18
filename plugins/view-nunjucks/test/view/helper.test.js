'use strict';

const path = require('path');
const mm = require('egg-mock');
const stripIndent = require('common-tags').stripIndent;

describe('test/view/helper.test.js', () => {
  let app;

  before(function* () {
    app = mm.app({
      baseDir: 'view-helper',
      framework: path.join(__dirname, '../fixtures/framework'),
    });
    yield app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should use view helper', function* () {
    yield app
      .httpRequest()
      .get('/helper')
      .expect(200)
      .expect(
        new RegExp(stripIndent`
        value: bar
        value: undefined
        value: bar
        value: bar
        /nunjucks_filters
      `)
      );
  });

  it('should use override escape', function* () {
    yield app
      .httpRequest()
      .get('/escape')
      .expect(200)
      .expect(stripIndent`
        <safe>
        &lt;escape2&gt;
        <helper-safe>
        &lt;helper&gt;
        &lt;helper-escape&gt;
        &lt;helper-escape&gt;
        &lt;helper2&gt;
      `);
  });

  describe('fill nunjucks filter to helper', function () {
    it('should merge nunjucks filter to view helper', function* () {
      yield app.httpRequest().get('/nunjucks_filters').expect(200).expect(/EGG/);
    });

    it('should work .safe', function* () {
      yield app
        .httpRequest()
        .get('/helper')
        .expect(200)
        .expect(/safe: <div>foo<\/div>\n/);
      // const html = '<div>foo</div>';
      // assert(helper.safe(html).toString() === html);
    });

    it('should work .escape', function* () {
      yield app
        .httpRequest()
        .get('/helper')
        .expect(200)
        .expect(/escape: &lt;div&gt;foo&lt;\/div&gt;\n/);
      // assert(helper.escape('<div>foo</div>').toString() === '&lt;div&gt;foo&lt;/div&gt;');
    });

    it('should work safe & escape', function* () {
      yield app
        .httpRequest()
        .get('/helper')
        .expect(200)
        .expect(/safe-escape: <div>&lt;span&gt;<\/div>\n/);
      // const out = helper.safe('<div>' + helper.escape('<span>') + '</div>');
      // assert(out.toString() === '<div>&lt;span&gt;</div>');
    });

    it('should work .csrfTag', function* () {
      yield app
        .httpRequest()
        .get('/helper')
        .expect(200)
        .expect(/csrfTag: <input type="hidden" name="_csrf" value=".*?" \/>\n/);
      // assert(helper.csrfTag().toString() === '<input type="hidden" name="_csrf" value="foobar" />');
    });
  });
});
