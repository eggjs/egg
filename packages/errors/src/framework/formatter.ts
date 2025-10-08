import util from 'node:util';
import os from 'node:os';

import { FrameworkBaseError } from './framework_base_error.ts';

const hostname = os.hostname();

export class FrameworkErrorFormatter {
  protected static faqPrefix = 'https://eggjs.org/zh-cn/faq';
  /**
   * Custom framework error FAQ prefix
   */
  private static faqPrefixEnv = process.env.EGG_FRAMEWORK_ERR_FAQ_PREFIX ?? process.env.EGG_FRAMEWORK_ERR_FAQ_PERFIX;

  static format(err: Error): string {
    const faqPrefix = this.faqPrefixEnv ?? this.faqPrefix;
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
      // @ts-expect-error ignore
      err.code,
      // @ts-expect-error ignore
      err.serialNumber,
      // @ts-expect-error ignore
      err.errorContext,
      process.pid,
      hostname
    );
  }

  static formatError<T extends Error>(err: T): T {
    const faqPrefix = this.faqPrefixEnv ?? this.faqPrefix;
    if (FrameworkBaseError.isFrameworkError(err) && !err.message.includes(faqPrefix)) {
      err.message += ` [ ${faqPrefix}/${err.code} ]`;
    }
    return err;
  }
}
