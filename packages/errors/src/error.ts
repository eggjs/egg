import { EggBaseError } from './base_error.ts';
import type { ErrorOptions } from './error_options.ts';

export class EggError extends EggBaseError<ErrorOptions> {
  constructor(message?: string) {
    super({
      code: 'EGG_ERROR',
      message: message ?? '',
    });
  }
}
