import ErrorOptions from './error_options';
import EggBaseError from './base_error';

class EggError extends EggBaseError<ErrorOptions> {
  constructor(message?: string) {
    super({
      code: 'EGG_ERROR',
      message: message || '',
    });
  }
}

export default EggError;
