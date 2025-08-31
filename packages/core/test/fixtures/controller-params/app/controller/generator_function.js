'use strict';

module.exports = async function (...args) {
  this.body = 'done';
  return args;
};
