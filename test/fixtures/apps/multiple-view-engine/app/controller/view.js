'use strict';

exports.renderEjs = ctx => ctx.render('ext/a.ejs', { data: 1 }, { opt: 1 });
exports.renderNunjucks = ctx => ctx.render('ext/a.nj', { data: 1 }, { opt: 1 });
exports.renderWithOptions = ctx => ctx.render('ext/a.nj', {}, { viewEngine: 'ejs' });

const tpl = 'hello world';
const opt = { viewEngine: 'ejs' };
exports.renderString = ctx => ctx.renderString(tpl, { data: 1 }, opt).then(data => ctx.body = data);
exports.renderStringWithoutViewEngine = ctx => {
  try {
    return ctx.renderString(tpl)
  } catch (err) {
    return Promise.reject(err.message);
  }
};
