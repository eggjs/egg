'use strict';
const path = require('path');
const fs = require('fs');
module.exports = (app) => {
  app.get('/', async function () {
    await this.render('home.tpl', { user: 'egg' });
  });

  app.get('/string', async function () {
    this.body = await this.renderString('hi, {{ user }}', { user: 'egg' });
  });

  app.get('/string_options', async function () {
    this.body = await this.renderString(
      fs.readFileSync(path.resolve(__dirname, './view/layout.tpl')).toString(),
      { user: 'egg' },
      { path: path.resolve(__dirname, './view/layout.tpl') },
    );
  });

  app.get('/inject', async function () {
    await this.render('inject.tpl', { user: 'egg' });
  });

  app.get('/filter', async function () {
    this.body = await this.renderString('{{ user | hello }}', { user: 'egg' });
  });

  app.get('/filter/include', async function () {
    await this.render('include-test.tpl', { list: ['egg', 'yadan'] });
  });

  app.get('/not_found', async function () {
    try {
      await this.render('not_found.tpl', {
        user: 'egg',
      });
    } catch (e) {
      this.status = 500;
      this.body = e.toString();
    }
  });

  app.get('/locals', async function () {
    this.locals = { b: 'ctx' };
    this.body = await this.renderString('{{ a }}, {{ b }}, {{ c }}', {
      c: 'locals',
    });
  });

  app.get('/error_string', async function () {
    try {
      this.body = await this.renderString('{{a');
    } catch (err) {
      this.status = 500;
      this.body = err;
    }
  });
};
