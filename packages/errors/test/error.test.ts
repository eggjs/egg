import { strict as assert } from 'assert';
import { describe, it } from 'vitest';
import {
  EggBaseError,
  EggBaseException,
  EggError,
  EggException,
  ErrorOptions,
  NotFoundError,
  InternalServerError,
} from '../src/index.ts';

describe('test/error.test.ts', () => {
  describe('base error', () => {
    it('should instantiate without params', () => {
      const err = new EggBaseError();
      assert(err.code === '');
      assert(err.message === '');
      assert(err.name === 'EggBaseError');
    });

    it('should instantiate with object', () => {
      const err = new EggBaseError({
        code: 'CODE',
        message: 'error',
      });
      assert(err.code === 'CODE');
      assert(err.message === 'error');
      assert(err.name === 'EggBaseError');
    });
  });

  describe('error', () => {
    it('should instantiate without params', () => {
      const err = new EggError();
      assert(err.code === 'EGG_ERROR');
      assert(err.message === '');
      assert(err.name === 'EggError');
    });

    it('should instantiate with object', () => {
      const err = new EggError('egg error');
      assert(err.code === 'EGG_ERROR');
      assert(err.message === 'egg error');
      assert(err.name === 'EggError');
    });
  });

  describe('base exception', () => {
    it('should instantiate without params', () => {
      const err = new EggBaseException();
      assert(err.code === '');
      assert(err.message === '');
      assert(err.name === 'EggBaseException');
    });

    it('should instantiate with object', () => {
      const err = new EggBaseException({
        code: 'CODE',
        message: 'error',
      });
      assert(err.code === 'CODE');
      assert(err.message === 'error');
      assert(err.name === 'EggBaseException');
    });
  });

  describe('exception', () => {
    it('should instantiate without params', () => {
      const err = new EggException();
      assert(err.code === 'EGG_EXCEPTION');
      assert(err.message === '');
      assert(err.name === 'EggException');
    });

    it('should instantiate with object', () => {
      const err = new EggException('egg exception');
      assert(err.code === 'EGG_EXCEPTION');
      assert(err.message === 'egg exception');
      assert(err.name === 'EggException');
    });
  });

  describe('getType', () => {
    it('should return ERROR', () => {
      const err = new EggBaseError();
      assert(EggBaseError.getType(err) === 'ERROR');
    });

    it('should return EXCEPTION', () => {
      const err = new EggBaseException();
      assert(EggBaseError.getType(err) === 'EXCEPTION');
    });

    it('should return BUILTIN', () => {
      const err = new Error();
      assert(EggBaseError.getType(err) === 'BUILTIN');
    });
  });

  describe('from', () => {
    it('should create Error', () => {
      const now = Date.now();
      const err = new Error('error message');
      err.time = now;
      const err2 = EggBaseError.from(err);
      assert(err2.code === '');
      assert(err2.message === 'error message');
      assert(err2.name === 'EggBaseError');
      assert(err2.stack === err.stack);
      assert(err2.time === now);
      assert(EggBaseError.getType(err2) === 'ERROR');
    });

    it('should create Exception', () => {
      const err = new Error('error message');
      const err2 = EggBaseException.from(err);
      assert(err2.code === '');
      assert(err2.message === 'error message');
      assert(err2.name === 'EggBaseException');
      assert(err2.stack === err.stack);
      assert(EggBaseException.getType(err2) === 'EXCEPTION');
    });

    it('should create custom Error', () => {
      class CustomError extends EggBaseError<ErrorOptions> {
        public data: object;
      }
      const err = new Error('error message');
      const err2 = CustomError.from(err);
      assert(err2.code === '');
      assert(err2.message === 'error message');
      assert(err2.name === 'CustomError');
      assert(err2.stack === err.stack);
    });

    it('should create custom Error whit constructor params', () => {
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
      assert(err2.code === 'CustomCode');
      assert(err2.message === 'error message');
      assert(err2.name === 'CustomError');
      assert(err2.stack === err.stack);
      assert(err2.custom === true);
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
      assert(err2.code === '');
      assert(err2.message === 'error message');
      assert(err2.name === 'CustomError');
      assert(err2.stack === err.stack);
      assert(err2.custom === undefined);
    });

    it('should create http Error', () => {
      const err = new Error('error message');
      const err2 = InternalServerError.from(err);
      assert(err2.code === 'INTERNAL_SERVER_ERROR');
      assert(err2.message === 'error message');
      assert(err2.name === 'InternalServerError');
      assert(err2.stack === err.stack);
    });
  });

  describe('extendable', () => {
    it('custom error', () => {
      class CustomError extends EggBaseError<ErrorOptions> {}
      const err = new CustomError({
        code: 'CODE',
        message: 'error',
      });
      assert(err.code === 'CODE');
      assert(err.message === 'error');
      assert(err.name === 'CustomError');
    });

    it('custom error with options', () => {
      class CustomErrorOptions extends ErrorOptions {
        public data: object;
      }
      class CustomError extends EggBaseError<CustomErrorOptions> {
        public data: object;
        protected options: CustomErrorOptions;

        constructor(message?: CustomErrorOptions) {
          super(message);
          this.data = this.options.data;
        }
      }
      const err = new CustomError({
        code: 'CODE',
        data: { a: 1 },
        message: 'error',
      });
      assert(err.code === 'CODE');
      assert(err.message === 'error');
      assert(err.name === 'CustomError');
      assert.deepEqual(err.data, { a: 1 });
    });
  });

  describe('header', () => {
    it('should has default header', () => {
      const err = new NotFoundError('sth not found');
      err.headers['Retry-After'] = 120;
    });
  });
});
