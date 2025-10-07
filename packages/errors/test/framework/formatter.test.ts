import { strict as assert } from 'assert';
import * as os from 'os';
import { describe, it, afterEach } from 'vitest';
import { mm } from 'mm';
import { FrameworkErrorFormater, FrameworkBaseError } from '../../src/index.ts';

const hostname = os.hostname();

describe('test/framework/formatter.test.ts', () => {
  afterEach(() => mm.restore());
  class CustomError extends FrameworkBaseError {
    get module() {
      return 'customPlugin';
    }
  }
  describe('format', () => {
    it('should format FrameworkError', () => {
      const err = new CustomError('error', '00', 'errorContext');
      const message = FrameworkErrorFormater.format(err);
      assert(message.includes('framework.CustomError: error [ https://eggjs.org/zh-cn/faq/customPlugin_00 ]'));
      assert(message.includes('code: customPlugin_00'));
      assert(message.includes('serialNumber: 00'));
      assert(message.includes('errorContext: "errorContext"'));
      assert(/pid:\s\d+/.test(message));
      assert(message.includes(`hostname: ${hostname}`));
      assert(!message.includes('message: error'));
      assert(!message.includes('name: CustomError'));
      assert(!message.includes('options:'));
    });

    it('should format normal error', () => {
      const err = new Error('error');
      const message = FrameworkErrorFormater.format(err);
      assert(message.includes('framework.Error: error'));
      assert(!message.includes('[ https://www.xxx.com/faq'));
      assert(/pid:\s\d+/.test(message));
      assert(message.includes(`hostname: ${hostname}`));
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
      const message = FrameworkErrorFormater.format(err);
      assert(
        /errorContext: \{"str":"str","num":123,"obj":\{"buf":\{"type":"Buffer","data":\[97,97,97\]\},"obj":\{"date":".*","obj":\{"arr":\["abc",123\]\}\},"arr":\[false,true\]\}\}/.test(
          message
        )
      );
    });

    it('should use default faqPrefix', () => {
      const err = new CustomError('error', '00');
      const message = FrameworkErrorFormater.format(err);
      assert(message.includes('framework.CustomError: error [ https://eggjs.org/zh-cn/faq/customPlugin_00 ]'));
    });

    it('should use faqPrefixEnv', () => {
      mock(FrameworkErrorFormater, 'faqPrefixEnv', 'https://www.custom.com/faq');
      const err = new CustomError('error', '00');
      const message = FrameworkErrorFormater.format(err);
      assert(message.includes('framework.CustomError: error [ https://www.custom.com/faq/customPlugin_00 ]'));
    });
  });

  describe('extendable', () => {
    it('custom formatter should work', () => {
      class CustomErrorFormatter extends FrameworkErrorFormater {
        static faqPrefix = 'http://custom/faq';
      }
      const err = new CustomError('error', '00');
      const message = CustomErrorFormatter.format(err);
      assert(message.includes('framework.CustomError: error [ http://custom/faq/customPlugin_00 ]'));
    });
  });

  describe('formatError', () => {
    it('should format FrameworkError', () => {
      let err = new CustomError('error', '00', 'errorContext');
      err = FrameworkErrorFormater.formatError(err);
      assert(err.message === 'error [ https://eggjs.org/zh-cn/faq/customPlugin_00 ]');
    });

    it('should format normal error', () => {
      let err = new Error('error');
      err = FrameworkErrorFormater.formatError(err);
      assert(err.message === 'error');
    });

    it('should use default faqPrefix', () => {
      let err = new CustomError('error', '00');
      err = FrameworkErrorFormater.formatError(err);
      assert(err.message === 'error [ https://eggjs.org/zh-cn/faq/customPlugin_00 ]');
    });

    it('should use faqPrefixEnv', () => {
      mock(FrameworkErrorFormater, 'faqPrefixEnv', 'https://www.custom.com/faq');
      let err = new CustomError('error', '00');
      err = FrameworkErrorFormater.formatError(err);
      assert(err.message === 'error [ https://www.custom.com/faq/customPlugin_00 ]');
    });

    it('will not append faq twice', () => {
      let err = new CustomError('error', '00', 'errorContext');
      err = FrameworkErrorFormater.formatError(err);
      const message = FrameworkErrorFormater.format(err);
      assert(message.split('https://eggjs.org/zh-cn/faq').length === 2);
    });

    describe('extendable', () => {
      it('custom formatter should work', () => {
        class CustomErrorFormatter extends FrameworkErrorFormater {
          static faqPrefix = 'http://custom/faq';
        }
        let err = new CustomError('error', '00');
        err = CustomErrorFormatter.formatError(err);
        assert(err.message === 'error [ http://custom/faq/customPlugin_00 ]');
      });
    });
  });
});
