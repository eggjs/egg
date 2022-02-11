'use strict';

const path = require('path');

module.exports = () => {
  return require('koa-static')(path.join(process.cwd(), 'docs/dist'));
};
