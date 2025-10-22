'use strict';

const stripIndent = require('common-tags').stripIndent;

module.exports = (app) => {
  app.get('/xss', async function () {
    const tpl = stripIndent`
      {{ url }}
      {{ url | safe }}
      {{ helper.surl(url) }}
      {{ html }}
    `;
    this.body = await this.renderString(tpl, {
      url: 'http://eggjs.github.io/index.html?a=<div>',
      html: '<div id="a">\'a\'</div>',
    });
  });

  app.get('/sjs', async function () {
    const tpl = stripIndent`
      var foo = "{{ helper.sjs(foo) }}";
    `;
    this.body = await this.renderString(tpl, {
      foo: '"hello"',
    });
  });

  app.get('/shtml', async function () {
    const tpl = stripIndent`
      {{helper.shtml(foo)}}
    `;
    this.body = await this.renderString(tpl, {
      foo: '<img onload="xx"><h1>foo</h1>',
    });
  });

  app.get('/form_csrf', async function () {
    await this.render('form_csrf.tpl');
  });

  app.get('/nonce', async function () {
    await this.render('nonce.tpl');
  });

  app.get('/escape', async function () {
    await this.render('escape.tpl', {
      foo: '<html>',
      arr: ['<p>arr</p>'],
      obj: {
        toString() {
          return '<p>obj</p>';
        },
      },
    });
  });

  app.get('/sandbox', async function () {
    const tpl = this.query.tpl;
    const name = this.query.name;
    this.body = await this.renderString(`hi, ${tpl}`, { name });
  });
};
