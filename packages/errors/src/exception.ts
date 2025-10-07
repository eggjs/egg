import { ErrorOptions } from './error_options.ts';
import { EggBaseException } from './base_exception.ts';

export class EggException extends EggBaseException<ErrorOptions> {
  constructor(message?: string) {
    super({
      code: 'EGG_EXCEPTION',
      message: message ?? '',
    });
  }
}
