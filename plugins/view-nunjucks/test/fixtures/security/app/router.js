'use strict';

const stripIndent = require('common-tags').stripIndent;

module.exports = app => {
  app.get('/xss', function* () {
    const tpl = stripIndent`
      {{ url }}
      {{ url | safe }}
      {{ helper.surl(url) }}
      {{ html }}
    `;
    this.body = yield this.renderString(tpl, {
      url: 'http://eggjs.github.io/index.html?a=<div>',
      html: '<div id="a">\'a\'</div>',
    });
  });

  app.get('/sjs', function* () {
    const tpl = stripIndent`
      var foo = "{{ helper.sjs(foo) }}";
    `;
    this.body = yield this.renderString(tpl, {
      foo: '"hello"',
    });
  });

  app.get('/shtml', function* () {
    const tpl = stripIndent`
      {{helper.shtml(foo)}}
    `;
    this.body = yield this.renderString(tpl, {
      foo: '<img onload="xx"><h1>foo</h1>',
    });
  });

  app.get('/form_csrf', function* () {
    yield this.render('form_csrf.tpl');
  });

  app.get('/nonce', function* () {
    yield this.render('nonce.tpl');
  });

  app.get('/escape', function* () {
    yield this.render('escape.tpl', {
      foo: '<html>',
      arr: ['<p>arr</p>'],
      obj: {
        toString() {
          return '<p>obj</p>';
        },
      },
    });
  });

  app.get('/sandbox', function* () {
    const tpl = this.query.tpl;
    const name = this.query.name;
    this.body = yield this.renderString(`hi, ${tpl}`, { name });
  });
};
