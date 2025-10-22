import * as os from 'os';
import { describe, it, afterEach, expect, vi } from 'vitest';
import { FrameworkErrorFormatter, FrameworkBaseError } from '../../src/index.ts';

const hostname = os.hostname();

describe('test/framework/formatter.test.ts', () => {
  afterEach(() => vi.restoreAllMocks());
  class CustomError extends FrameworkBaseError {
    get module() {
      return 'customPlugin';
    }
  }
  describe('format', () => {
    it('should format FrameworkError', () => {
      const err = new CustomError('error', '00', 'errorContext');
      const message = FrameworkErrorFormatter.format(err);
      expect(message).toContain('framework.CustomError: error [ https://eggjs.org/faq/customPlugin_00 ]');
      expect(message).toContain('code: customPlugin_00');
      expect(message).toContain('serialNumber: 00');
      expect(message).toContain('errorContext: "errorContext"');
      expect(message).toMatch(/pid:\s\d+/);
      expect(message).toContain(`hostname: ${hostname}`);
      expect(message).not.toContain('message: error');
      expect(message).not.toContain('name: CustomError');
      expect(message).not.toContain('options:');
    });

    it('should format normal error', () => {
      const err = new Error('error');
      const message = FrameworkErrorFormatter.format(err);
      expect(message).toContain('framework.Error: error');
      expect(message).not.toContain('[ https://www.xxx.com/faq');
      expect(message).toMatch(/pid:\s\d+/);
      expect(message).toContain(`hostname: ${hostname}`);
    });

    it('should format complex errorContext', () => {
      const err = new CustomError('error', '00', {
        str: 'str',
        num: 123,
        obj: {
          buf: Buffer.from('aaa'),
          obj: {
            date: new Date(),
            obj: {
              arr: ['abc', 123],
            },
          },
          arr: [false, true],
        },
      });
      const message = FrameworkErrorFormatter.format(err);
      expect(message).toMatch(
        /errorContext: \{"str":"str","num":123,"obj":\{"buf":\{"type":"Buffer","data":\[97,97,97\]\},"obj":\{"date":".*","obj":\{"arr":\["abc",123\]\}\},"arr":\[false,true\]\}\}/,
      );
    });

    it('should use default faqPrefix', () => {
      const err = new CustomError('error', '00');
      const message = FrameworkErrorFormatter.format(err);
      expect(message).toContain('framework.CustomError: error [ https://eggjs.org/faq/customPlugin_00 ]');
    });

    it('should use faqPrefixEnv', () => {
      // @ts-expect-error ignore
      vi.spyOn(FrameworkErrorFormatter, 'faqPrefixEnv', 'get').mockReturnValue('https://www.custom.com/faq');
      const err = new CustomError('error', '00');
      const message = FrameworkErrorFormatter.format(err);
      expect(message).toContain('framework.CustomError: error [ https://www.custom.com/faq/customPlugin_00 ]');
    });
  });

  describe('extendable', () => {
    it('custom formatter should work', () => {
      class CustomErrorFormatter extends FrameworkErrorFormatter {
        static faqPrefix = 'http://custom/faq';
      }
      const err = new CustomError('error', '00');
      const message = CustomErrorFormatter.format(err);
      expect(message).toContain('framework.CustomError: error [ http://custom/faq/customPlugin_00 ]');
    });
  });

  describe('formatError', () => {
    it('should format FrameworkError', () => {
      let err = new CustomError('error', '00', 'errorContext');
      err = FrameworkErrorFormatter.formatError(err);
      expect(err.message).toBe('error [ https://eggjs.org/faq/customPlugin_00 ]');
    });

    it('should format normal error', () => {
      let err = new Error('error');
      err = FrameworkErrorFormatter.formatError(err);
      expect(err.message).toBe('error');
    });

    it('should use default faqPrefix', () => {
      let err = new CustomError('error', '00');
      err = FrameworkErrorFormatter.formatError(err);
      expect(err.message).toBe('error [ https://eggjs.org/faq/customPlugin_00 ]');
    });

    it('should use faqPrefixEnv', () => {
      // @ts-expect-error ignore
      vi.spyOn(FrameworkErrorFormatter, 'faqPrefixEnv', 'get').mockReturnValue('https://www.custom.com/faq');
      let err = new CustomError('error', '00');
      err = FrameworkErrorFormatter.formatError(err);
      expect(err.message).toBe('error [ https://www.custom.com/faq/customPlugin_00 ]');
    });

    it('will not append faq twice', () => {
      let err = new CustomError('error', '00', 'errorContext');
      err = FrameworkErrorFormatter.formatError(err);
      const message = FrameworkErrorFormatter.format(err);
      expect(message.split('https://eggjs.org/faq').length).toBe(2);
    });

    describe('extendable', () => {
      it('custom formatter should work', () => {
        class CustomErrorFormatter extends FrameworkErrorFormatter {
          static faqPrefix = 'http://custom/faq';
        }
        let err = new CustomError('error', '00');
        err = CustomErrorFormatter.formatError(err);
        expect(err.message).toBe('error [ http://custom/faq/customPlugin_00 ]');
      });
    });
  });
});
