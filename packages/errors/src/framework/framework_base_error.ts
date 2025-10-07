import assert from 'node:assert';

import { EggBaseError } from '../base_error.ts';
import { ErrorOptions } from '../error_options.ts';
import { FrameworkErrorFormater } from './formatter.ts';

export const FRAMEWORK_ERROR_SYMBOL = Symbol.for('FrameworkBaseError');

export class FrameworkBaseError extends EggBaseError<ErrorOptions> {
  public readonly serialNumber: string;
  public readonly errorContext?: any;

  get module(): string {
    throw new Error('module should be implement');
  }

  constructor(message: string, serialNumber: string | number, errorContext?: any) {
    super({ message, serialNumber, errorContext });
    assert(message, 'message is required');
    assert(serialNumber, 'serialNumber is required');

    this.serialNumber = `${serialNumber}`;
    this.errorContext = errorContext ?? '';
    this.code = `${this.module}_${this.serialNumber}`;
    // @ts-expect-error ignore
    this[FRAMEWORK_ERROR_SYMBOL] = true;
  }

  // create a new frameworkError with format
  static create(message: string, serialNumber: string | number, errorContext?: any) {
    const err = FrameworkErrorFormater.formatError(new this(message, serialNumber, errorContext));
    Error.captureStackTrace(err, this.create);
    return err;
  }

  static isFrameworkError(err: Error): err is FrameworkBaseError {
    // @ts-expect-error ignore
    return err[FRAMEWORK_ERROR_SYMBOL] === true;
  }
}
