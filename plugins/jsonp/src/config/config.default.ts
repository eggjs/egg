import type { PartialEggConfig } from 'egg';

export interface JSONPConfig {
  /**
   * jsonp callback methods key, default to `['_callback', 'callback' ]`
   */
  callback: string[] | string;
  /**
   * callback method name's max length, default to `50`
   */
  limit: number;
  /**
   * enable csrf check or not, default to `false`
   */
  csrf: boolean;
  /**
   * referrer white list, default to `undefined`
   */
  whiteList?: string | RegExp | (string | RegExp)[];
}

export default {
  jsonp: {
    limit: 50,
    callback: ['_callback', 'callback'],
    csrf: false,
    whiteList: undefined,
  },
} as PartialEggConfig;
