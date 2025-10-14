import { BaseError } from './base.ts';
import type { ErrorOptions } from './error_options.ts';
import { ErrorType } from './error_type.ts';

export class EggBaseError<T extends ErrorOptions> extends BaseError<T> {
  constructor(options?: T) {
    super({
      ...options,
      errorType: ErrorType.ERROR,
    } as T);
  }
}
