import { BaseContextClass as EggCoreBaseContextClass } from '@eggjs/core';

import type { Context } from '../egg.ts';
import type { Application } from '../application.ts';
import { BaseContextLogger } from './base_context_logger.ts';
import type { IService } from '../types.ts';

/**
 * BaseContextClass is a base class that can be extended,
 * it's instantiated in context level,
 * {@link Helper}, {@link Service} is extending it.
 */
export class BaseContextClass extends EggCoreBaseContextClass {
  [key: string | symbol]: any;
  declare ctx: Context;
  declare pathName?: string;
  declare app: Application;
  declare service: IService;
  #logger?: BaseContextLogger;

  get logger(): BaseContextLogger {
    if (!this.#logger) {
      this.#logger = new BaseContextLogger(this.ctx, this.pathName);
    }
    return this.#logger;
  }
}
