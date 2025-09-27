/**
 * File Inclusion
 */

import type { BaseContextClass } from 'egg';

export default function pathFilter(this: BaseContextClass, path: string) {
  if (typeof path !== 'string') return path;

  const pathSource = path;

  while (path.indexOf('%') !== -1) {
    try {
      path = decodeURIComponent(path);
    } catch {
      if (process.env.NODE_ENV !== 'production') {
        // Not a PROD env, logging with a warning.
        this.ctx.coreLogger.warn('[@eggjs/security/lib/helper/spath] : decode file path %j failed.', path);
      }
      break;
    }
  }
  if (path.indexOf('..') !== -1 || path[0] === '/') {
    return null;
  }
  return pathSource;
}
