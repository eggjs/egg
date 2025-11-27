import { describe, it, expect } from 'vitest';

import {
  EggBaseError,
  EggBaseException,
  EggError,
  EggException,
  type ErrorOptions,
  NotFoundError,
  InternalServerError,
} from '../src/index.ts';

describe('test/error.test.ts', () => {
  describe('base error', () => {
    it('should instantiate without params', () => {
      const err = new EggBaseError();
      expect(err.code).toBe('');
      expect(err.message).toBe('');
      expect(err.name).toBe('EggBaseError');
    });

    it('should instantiate with object', () => {
      const err = new EggBaseError({
        code: 'CODE',
        message: 'error',
      });
      expect(err.code).toBe('CODE');
      expect(err.message).toBe('error');
      expect(err.name).toBe('EggBaseError');
    });
  });

  describe('error', () => {
    it('should instantiate without params', () => {
      const err = new EggError();
      expect(err.code).toBe('EGG_ERROR');
      expect(err.message).toBe('');
      expect(err.name).toBe('EggError');
    });

    it('should instantiate with object', () => {
      const err = new EggError('egg error');
      expect(err.code).toBe('EGG_ERROR');
      expect(err.message).toBe('egg error');
      expect(err.name).toBe('EggError');
    });
  });

  describe('base exception', () => {
    it('should instantiate without params', () => {
      const err = new EggBaseException();
      expect(err.code).toBe('');
      expect(err.message).toBe('');
      expect(err.name).toBe('EggBaseException');
    });

    it('should instantiate with object', () => {
      const err = new EggBaseException({
        code: 'CODE',
        message: 'error',
      });
      expect(err.code).toBe('CODE');
      expect(err.message).toBe('error');
      expect(err.name).toBe('EggBaseException');
    });
  });

  describe('exception', () => {
    it('should instantiate without params', () => {
      const err = new EggException();
      expect(err.code).toBe('EGG_EXCEPTION');
      expect(err.message).toBe('');
      expect(err.name).toBe('EggException');
    });

    it('should instantiate with object', () => {
      const err = new EggException('egg exception');
      expect(err.code).toBe('EGG_EXCEPTION');
      expect(err.message).toBe('egg exception');
      expect(err.name).toBe('EggException');
    });
  });

  describe('getType', () => {
    it('should return ERROR', () => {
      const err = new EggBaseError();
      expect(EggBaseError.getType(err)).toBe('ERROR');
    });

    it('should return EXCEPTION', () => {
      const err = new EggBaseException();
      expect(EggBaseError.getType(err)).toBe('EXCEPTION');
    });

    it('should return BUILTIN', () => {
      const err = new Error();
      expect(EggBaseError.getType(err)).toBe('BUILTIN');
    });
  });

  describe('from', () => {
    it('should create Error', () => {
      const now = Date.now();
      const err = new Error('error message');
      // @ts-expect-error test
      err.time = now;
      const err2 = EggBaseError.from(err);
      expect(err2.code).toBe('');
      expect(err2.message).toBe('error message');
      expect(err2.name).toBe('EggBaseError');
      expect(err2.stack).toBe(err.stack);
      expect(err2.time).toBe(now);
      expect(EggBaseError.getType(err2)).toBe('ERROR');
    });

    it('should create Exception', () => {
      const err = new Error('error message');
      const err2 = EggBaseException.from(err);
      expect(err2.code).toBe('');
      expect(err2.message).toBe('error message');
      expect(err2.name).toBe('EggBaseException');
      expect(err2.stack).toBe(err.stack);
      expect(EggBaseException.getType(err2)).toBe('EXCEPTION');
    });

    it('should create custom Error', () => {
      class CustomError extends EggBaseError<ErrorOptions> {
        public data: object;
      }
      const err = new Error('error message');
      const err2 = CustomError.from(err);
      expect(err2.code).toBe('');
      expect(err2.message).toBe('error message');
      expect(err2.name).toBe('CustomError');
      expect(err2.stack).toBe(err.stack);
    });

    it('should create custom Error with constructor params', () => {
      interface CustomErrorOptions extends ErrorOptions {
        add: string;
      }

      class CustomError extends EggBaseError<CustomErrorOptions> {
        custom: boolean;
        constructor(options: CustomErrorOptions, custom: boolean) {
          super(options);
          this.custom = custom;
        }
      }
      const err = new Error('error message');
      const err2 = CustomError.from(err, { code: 'CustomCode', message: 'custom message', add: '' }, true);
      expect(err2.code).toBe('CustomCode');
      expect(err2.message).toBe('error message');
      expect(err2.name).toBe('CustomError');
      expect(err2.stack).toBe(err.stack);
      expect(err2.custom).toBe(true);
    });

    it('should create custom Error not whit constructor params', () => {
      interface CustomErrorOptions extends ErrorOptions {
        add: string;
      }

      class CustomError extends EggBaseError<CustomErrorOptions> {
        custom: boolean;
        constructor(options: CustomErrorOptions, custom: boolean) {
          super(options);
          this.custom = custom;
        }
      }
      const err = new Error('error message');
      const err2 = CustomError.from(err);
      expect(err2.code).toBe('');
      expect(err2.message).toBe('error message');
      expect(err2.name).toBe('CustomError');
      expect(err2.stack).toBe(err.stack);
      expect(err2.custom).toBe(undefined);
    });

    it('should create http Error', () => {
      const err = new Error('error message');
      const err2 = InternalServerError.from(err);
      expect(err2.code).toBe('INTERNAL_SERVER_ERROR');
      expect(err2.message).toBe('error message');
      expect(err2.name).toBe('InternalServerError');
      expect(err2.stack).toBe(err.stack);
    });
  });

  describe('extendable', () => {
    it('custom error', () => {
      class CustomError extends EggBaseError<ErrorOptions> {}
      const err = new CustomError({
        code: 'CODE',
        message: 'error',
      });
      expect(err.code).toBe('CODE');
      expect(err.message).toBe('error');
      expect(err.name).toBe('CustomError');
    });

    it('custom error with options', () => {
      interface CustomErrorOptions extends ErrorOptions {
        data: object;
      }
      class CustomError extends EggBaseError<CustomErrorOptions> {
        public data: object;
        declare protected options: CustomErrorOptions;

        constructor(options?: CustomErrorOptions) {
          super(options);
          this.data = this.options.data;
        }
      }
      const err = new CustomError({
        code: 'CODE',
        data: { a: 1 },
        message: 'error',
      });
      expect(err.code).toBe('CODE');
      expect(err.message).toBe('error');
      expect(err.name).toBe('CustomError');
      expect(err.data).toEqual({ a: 1 });
    });
  });

  describe('header', () => {
    it('should has default header', () => {
      const err = new NotFoundError('sth not found');
      err.headers['Retry-After'] = 120;
    });
  });
});
