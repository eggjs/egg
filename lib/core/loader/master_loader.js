'use strict';

const path = require('path');
const BaseLoader = require('egg-loader');

/**
 * master process Loader, won't load plugins
 * @see https://github.com/eggjs/egg-loader
 */
class MasterLoader extends BaseLoader {
  constructor(options) {
    options.eggPath = path.join(__dirname, '../../..');
    super(options);
  }
}

module.exports = MasterLoader;
