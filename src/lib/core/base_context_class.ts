import { BaseContextClass as EggCoreBaseContextClass } from '@eggjs/core';
import { BaseContextLogger } from './base_context_logger';

const LOGGER = Symbol('BaseContextClass#logger');

/**
 * BaseContextClass is a base class that can be extended,
 * it's instantiated in context level,
 * {@link Helper}, {@link Service} is extending it.
 */
export class BaseContextClass extends EggCoreBaseContextClass {
  protected pathName?: string;

  get logger() {
    if (!this[LOGGER]) this[LOGGER] = new BaseContextLogger(this.ctx, this.pathName);
    return this[LOGGER];
  }
}
