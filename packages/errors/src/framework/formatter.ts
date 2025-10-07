import { FrameworkBaseError } from './framework_base_error';
import * as util from 'util';
import * as os from 'os';
const hostname = os.hostname();

export class FrameworkErrorFormater {
  protected static faqPrefix = 'https://eggjs.org/zh-cn/faq';
  private static faqPrefixEnv = process.env.EGG_FRAMEWORK_ERR_FAQ_PERFIX;

  static format(err: Error): string {
    const faqPrefix = this.faqPrefixEnv || this.faqPrefix;
    let errMessage = err.message;
    if (FrameworkBaseError.isFrameworkError(err) && !errMessage.includes(faqPrefix)) {
      errMessage += ` [ ${faqPrefix}/${err.code} ]`;
    }
    const errStack = err.stack || 'no_stack';

    return util.format(
      'framework.%s: %s\n%s\ncode: %s\nserialNumber: %s\nerrorContext: %j\npid: %s\nhostname: %s\n',
      err.name,
      errMessage,
      errStack.substring(errStack.indexOf('\n') + 1),
      err.code,
      err.serialNumber,
      err.errorContext,
      process.pid,
      hostname
    );
  }

  static formatError<T extends Error>(err: T): T {
    const faqPrefix = this.faqPrefixEnv || this.faqPrefix;
    if (FrameworkBaseError.isFrameworkError(err) && !err.message.includes(faqPrefix)) {
      err.message += ` [ ${faqPrefix}/${err.code} ]`;
    }
    return err;
  }
}
