'use strict';

exports.next = async function (next) {
  await next();
  this.body = 'done';
};
