'use strict';

exports.renderEjs = ctx => ctx.render('ext/a.ejs', { data: 1 }, { opt: 1 });
exports.renderNunjucks = ctx => ctx.render('ext/a.nj', { data: 1 }, { opt: 1 });
exports.renderWithOptions = ctx => ctx.render('ext/a.nj', {}, { viewEngine: 'ejs' });

exports.renderWithoutExt = ctx => ctx.render('loader/a', { data: 1 }, { opt: 1 });
exports.renderExtWithoutConfig = ctx => {
  try {
    return ctx.render('loader/a.noext');
  } catch (err) {
    return Promise.reject(err.message);
  }
};

exports.renderWithoutViewEngine = ctx => {
  try {
    return ctx.render('loader/a.html');
  } catch (err) {
    return Promise.reject(err.message);
  }
};

exports.renderMultipleRoot = ctx => ctx.render('loader/from-view2.ejs');
exports.renderMultipleRootWithoutExtension = ctx => ctx.render('loader/from-view2');
exports.loadSameFile = ctx => ctx.render('loader/a.nj');
exports.loadFileNoexist = ctx => {
  try {
    return ctx.render('noexist.ejs');
  } catch (err) {
    return Promise.reject(err.message);
  }
};

const tpl = 'hello world';
const opt = { viewEngine: 'ejs' };
exports.renderString = ctx => ctx.renderString(tpl, { data: 1 }, opt).then(data => (ctx.body = data));

exports.renderStringWithoutViewEngine = ctx => {
  try {
    return ctx.renderString(tpl);
  } catch (err) {
    return Promise.reject(err.message);
  }
};

exports.renderLocals = ctx => {
  ctx.locals = {
    a: 1,
    b: 1,
  };
  return ctx.render('ext/a.ejs', { b: 2 });
};

exports.renderOriginalLocals = ctx => {
  ctx.locals = {
    a: 1,
    b: 1,
  };
  return ctx.render('ext/a.ejs', { b: 2 });
};

exports.renderStringLocals = ctx => {
  ctx.locals = {
    a: 1,
    b: 1,
  };
  return ctx.render('', { b: 2 }, { viewEngine: 'ejs' });
};

exports.renderStringTwice = async ctx => {
  const opt = { viewEngine: 'ejs' };
  const res = await Promise.all([ctx.renderString('a', {}, opt), ctx.renderString('b', {}, opt)]);
  ctx.body = res.map(o => o.tpl).join(',');
};

exports.renderAsync = ctx => ctx.render('ext/a.async');

exports.renderStringAsync = ctx =>
  ctx.renderString('async function', {}, { viewEngine: 'async' }).then(data => (ctx.body = data));
