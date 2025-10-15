import { BaseError } from "./base.ts";
import type { ErrorOptions } from "./error_options.ts";
import { ErrorType } from "./error_type.ts";

export class EggBaseException<
  T extends ErrorOptions = ErrorOptions,
> extends BaseError<T> {
  constructor(options?: T) {
    super({
      errorType: ErrorType.EXCEPTION,
      ...options,
    } as T);
  }
}
