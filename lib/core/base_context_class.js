'use strict';

const EggCoreBaseContextClass = require('egg-core').BaseContextClass;
const BaseContextLogger = require('./base_context_logger');

const LOGGER = Symbol('BaseContextClass#logger');

/**
 * BaseContextClass is a base class that can be extended,
 * it's instantiated in context level,
 * {@link Helper}, {@link Service} is extending it.
 */
class BaseContextClass extends EggCoreBaseContextClass {
  get logger() {
    if (!this[LOGGER]) this[LOGGER] = new BaseContextLogger(this.ctx, this.pathName);
    return this[LOGGER];
  }
}

module.exports = BaseContextClass;
