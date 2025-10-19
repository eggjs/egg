import { parse } from 'path-to-regexp';

export class HTTPPriorityUtil {
  static readonly DEFAULT_PRIORITY = 100000;
  private static readonly TOKEN_PRIORITY = 1000;

  /**
   * | Path | RegExp index | priority |
   * | --- | --- | --- |
   * | /* | [0] | 0 |
   * | /hello/:name | [1] | 1000 |
   * | /hello/world/message/:message | [3] | 3000 |
   * | /hello/:name/message/:message | [1, 3] | 4000 |
   * | /hello/world | [] | 100000/Infinity？ |
   *
   * priority = hasRegExp
   *   : regexpIndex.reduce((p,c) => p + c * 1000, 0)
   *   : 100000;
   * @param {string} path - path to calculate priority
   * @returns {number} priority
   */
  static calcPathPriority(path: string): number {
    const tokens = parse(path);
    let priority = 0;
    let hasRegExp = false;
    let index = 0;
    let token;
    while ((token = tokens.shift())) {
      if (typeof token === 'string') {
        // /view/users/*
        // token is [ '/view/users', '*' ]
        index += token.split('/').length - 1;
      } else {
        hasRegExp = true;
        priority += index++ * this.TOKEN_PRIORITY;
      }
    }
    if (!hasRegExp) {
      return this.DEFAULT_PRIORITY;
    }
    return priority;
  }
}
