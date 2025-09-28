import { TsGenConfig, TsHelperConfig } from '..';
import * as utils from '../utils';
import ClassGenerator from './class.js';

export default function AutoGenerator(config: TsGenConfig, baseConfig: TsHelperConfig) {
  config.interfaceHandle = config.interfaceHandle || 'AutoInstanceType<typeof {{ 0 }}>';

  const result = ClassGenerator(config, baseConfig);
  /* istanbul ignore else */
  if (result.content) {
    result.content = [
      'type AnyClass = new (...args: any[]) => any;',
      'type AnyFunc<T = any> = (...args: any[]) => T;',
      'type CanExportFunc = AnyFunc<Promise<any>> | AnyFunc<IterableIterator<any>>;',
      'type AutoInstanceType<T, U = T extends CanExportFunc ? T : T extends AnyFunc ? ReturnType<T> : T> = U extends AnyClass ? InstanceType<U> : U;',
      result.content,
    ].join('\n');
  }

  return result;
}

AutoGenerator.defaultConfig = utils.extend({}, ClassGenerator.defaultConfig);
