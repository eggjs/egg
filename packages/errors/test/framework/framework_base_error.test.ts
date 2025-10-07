import { describe, it, expect } from 'vitest';

import { FrameworkBaseError } from '../../src/index.ts';

describe('test/framework/framework_base_error.test.ts', () => {
  describe('invalid', () => {
    it('should throw error when message or serialNumber empty', () => {
      expect(() => {
        // @ts-expect-error ignore
        new FrameworkBaseError();
      }).throws(/message is required/);

      expect(() => {
        // @ts-expect-error ignore
        new FrameworkBaseError('error');
      }).throws(/serialNumber is required/);
    });

    it('should throw error use FrameworkBaseError directly', () => {
      expect(() => {
        new FrameworkBaseError('error', '0').module;
      }).throws(/module should be implement/);
    });
  });

  describe('extendable', () => {
    class CustomError extends FrameworkBaseError {
      get module() {
        return 'customPlugin';
      }
    }

    it('custom error should work', () => {
      const err = new CustomError('error', '00');
      expect(err.module).toBe('customPlugin');
      expect(err.code).toBe('customPlugin_00');
      expect(err.message).toBe('error');
      expect(err.name).toBe('CustomError');
      expect(err.serialNumber).toBe('00');
      expect(err.errorContext).toBe('');
    });

    it('serialNumber type number should work', () => {
      const err = new CustomError('error', 123);
      expect(err.module).toBe('customPlugin');
      expect(err.code).toBe('customPlugin_123');
      expect(err.message).toBe('error');
      expect(err.name).toBe('CustomError');
      expect(err.serialNumber).toBe('123');
      expect(err.errorContext).toBe('');
    });

    it('errorContext should work', () => {
      const err = new CustomError('error', 1, { traceId: 'xxx' });
      expect(err.module).toBe('customPlugin');
      expect(err.code).toBe('customPlugin_1');
      expect(err.message).toBe('error');
      expect(err.name).toBe('CustomError');
      expect(err.serialNumber).toBe('1');
      expect(err.errorContext).toEqual({ traceId: 'xxx' });
    });
  });

  describe('static method', () => {
    class TestError extends FrameworkBaseError {
      get module() {
        return 'TEST';
      }
    }

    it('should create static method work', async () => {
      const err = TestError.create('mock error', 'CODE', { data: 'data' });
      expect(err.module).toBe('TEST');
      expect(err.code).toBe('TEST_CODE');
      expect(err.message).toBe('mock error [ https://eggjs.org/zh-cn/faq/TEST_CODE ]');
      expect(err.serialNumber).toBe('CODE');
      expect(err.errorContext).toEqual({ data: 'data' });
      expect(err.stack).not.toContain('Function.create');
    });

    it('should isFrameworkError static method work', async () => {
      const err1 = TestError.create('mock error', 'CODE', { data: 'data' });
      const err2 = new TestError('mock error', 'CODE');
      const err3 = new Error('xxx');

      expect(FrameworkBaseError.isFrameworkError(err1)).toBe(true);
      expect(FrameworkBaseError.isFrameworkError(err2)).toBe(true);
      expect(FrameworkBaseError.isFrameworkError(err3)).toBe(false);
    });
  });
});
