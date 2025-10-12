import { EggBaseException } from './base_exception.ts';

export class EggException extends EggBaseException {
  constructor(message?: string) {
    super({
      code: 'EGG_EXCEPTION',
      message: message ?? '',
    });
  }
}
