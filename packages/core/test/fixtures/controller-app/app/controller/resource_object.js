'use strict';

exports.index = async function () {
  this.body = 'index';
};

exports.create = async ctx => {
  ctx.body = 'create';
};
