import { EggBaseError, ErrorOptions } from '../index.ts';
import { FrameworkErrorFormater } from './formatter.ts';
import { ok as assert } from 'assert';

export const FRAMEWORK_ERROR_SYMBOL: symbol = Symbol.for('FrameworkBaseError');

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

    this.serialNumber = String(serialNumber);
    this.errorContext = errorContext || '';
    this.code = `${this.module}_${this.serialNumber}`;

    (this as any)[FRAMEWORK_ERROR_SYMBOL] = true;
  }

  // create a new frameworkError with format
  static create(message: string, serialNumber: string | number, errorContext?: any) {
    const err = FrameworkErrorFormater.formatError(new this(message, serialNumber, errorContext));
    Error.captureStackTrace(err, this.create);
    return err;
  }

  static isFrameworkError(err: Error): err is FrameworkBaseError {
    return (err as any)[FRAMEWORK_ERROR_SYMBOL] === true;
  }
}
