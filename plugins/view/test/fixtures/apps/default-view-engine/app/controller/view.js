'use strict';

exports.render = ctx => ctx.render('a.html');
exports.renderString = ctx => ctx.renderString('').then(data => (ctx.body = data));
