'use strict';
const path = require('path');
const fs = require('fs');
module.exports = app => {
  app.get('/', function* () {
    yield this.render('home.tpl', { user: 'egg' });
  });

  app.get('/string', function* () {
    this.body = yield this.renderString('hi, {{ user }}', { user: 'egg' });
  });

  app.get('/string_options', function* () {
    this.body = yield this.renderString(
      fs.readFileSync(path.resolve(__dirname, './view/layout.tpl')).toString(),
      { user: 'egg' },
      { path: path.resolve(__dirname, './view/layout.tpl') }
    );
  });

  app.get('/inject', function* () {
    yield this.render('inject.tpl', { user: 'egg' });
  });

  app.get('/filter', function* () {
    this.body = yield this.renderString('{{ user | hello }}', { user: 'egg' });
  });

  app.get('/filter/include', function* () {
    yield this.render('include-test.tpl', { list: ['egg', 'yadan'] });
  });

  app.get('/not_found', function* () {
    try {
      yield this.render('not_found.tpl', {
        user: 'egg',
      });
    } catch (e) {
      this.status = 500;
      this.body = e.toString();
    }
  });

  app.get('/locals', function* () {
    this.locals = { b: 'ctx' };
    this.body = yield this.renderString('{{ a }}, {{ b }}, {{ c }}', { c: 'locals' });
  });

  app.get('/error_string', function* () {
    try {
      this.body = yield this.renderString('{{a');
    } catch (err) {
      this.status = 500;
      this.body = err;
    }
  });
};
