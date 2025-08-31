import { BaseContextClass as EggCoreBaseContextClass } from '@eggjs/core';
import type { Context, EggApplicationCore } from '../egg.js';
import { BaseContextLogger } from './base_context_logger.js';

/**
 * BaseContextClass is a base class that can be extended,
 * it's instantiated in context level,
 * {@link Helper}, {@link Service} is extending it.
 */
export class BaseContextClass extends EggCoreBaseContextClass {
  [key: string | symbol]: any;
  declare ctx: Context;
  declare pathName?: string;
  declare app: EggApplicationCore;
  declare service: BaseContextClass;
  #logger?: BaseContextLogger;

  get logger() {
    if (!this.#logger) {
      this.#logger = new BaseContextLogger(this.ctx, this.pathName);
    }
    return this.#logger;
  }
}
