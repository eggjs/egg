import { BaseContextClass as EggCoreBaseContextClass } from '@eggjs/core';
import type { ContextDelegation } from '../egg.js';
import { BaseContextLogger } from './base_context_logger.js';

/**
 * BaseContextClass is a base class that can be extended,
 * it's instantiated in context level,
 * {@link Helper}, {@link Service} is extending it.
 */
export class BaseContextClass extends EggCoreBaseContextClass {
  declare ctx: ContextDelegation;
  protected pathName?: string;
  #logger?: BaseContextLogger;

  get logger() {
    if (!this.#logger) {
      this.#logger = new BaseContextLogger(this.ctx, this.pathName);
    }
    return this.#logger;
  }
}
