import type { ErrorOptions } from './error_options.ts';
import { ErrorType } from './error_type.ts';

export const TYPE: symbol = Symbol.for('BaseError#type');

export class BaseError<T extends ErrorOptions> extends Error {
  [key: string]: any;

  public static getType(err: Error): ErrorType {
    // @ts-expect-error `err[TYPE]` is only available on BaseError
    return err[TYPE] ?? ErrorType.BUILTIN;
  }

  /**
   * Create a new instance of the error class from an existing error
   * @param err - The error to create a new instance from
   * @param args - The arguments to pass to the constructor
   * @returns A new instance of the error class
   */
  public static from<
    S extends new (...args: any) => InstanceType<typeof BaseError>,
    P extends ConstructorParameters<S>,
  >(this: S, err: Error, ...args: P | undefined[]): InstanceType<S> {
    // oxlint-disable-next-line no-this-alias
    const ErrorClass = this;
    const newErr = new ErrorClass(...(args as any[]));
    newErr.message = err.message;
    newErr.stack = err.stack;
    for (const key of Object.keys(err)) {
      // @ts-expect-error ignore
      newErr[key] = err[key];
    }
    return newErr as InstanceType<S>;
  }

  code: string;
  protected options: T;

  constructor(options?: T) {
    super();
    this.options = (options ?? {}) as T;
    this.message = this.options.message ?? '';
    this.code = this.options.code ?? '';
    this.name = this.constructor.name;
    if (this.options.errorType) {
      // @ts-expect-error `this[TYPE]` is only available on BaseError
      this[TYPE] = this.options.errorType;
    }
  }
}
