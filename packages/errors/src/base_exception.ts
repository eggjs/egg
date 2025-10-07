import { BaseError, TYPE } from './base.ts';
import { ErrorOptions } from './error_options.ts';
import { ErrorType } from './error_type.ts';

export class EggBaseException<T extends ErrorOptions> extends BaseError<T> {
  constructor(options?: T) {
    super(options);
    this[TYPE] = ErrorType.EXCEPTION;
  }
}
