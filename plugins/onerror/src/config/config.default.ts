import path from 'node:path';

import type { Context } from 'egg';
import type { OnerrorError, OnerrorOptions } from 'koa-onerror';

export interface OnerrorConfig extends OnerrorOptions {
  /**
   * 5xx error will redirect to ${errorPageUrl}
   * won't redirect in local env
   *
   * Default: `''`
   */
  errorPageUrl: string | ((err: OnerrorError, ctx: Context) => string);
  /**
   * will execute `appErrorFilter` when emit an error in `app`
   * If `appErrorFilter` return false, egg-onerror won't log this error.
   * You can logging in `appErrorFilter` and return false to override the default error logging.
   *
   * Default: `undefined`
   */
  appErrorFilter?: (err: OnerrorError, ctx: Context) => boolean;
  /**
   * default template path
   */
  templatePath: string;
}

export default {
  onerror: {
    errorPageUrl: '',
    appErrorFilter: undefined,
    templatePath: path.join(import.meta.dirname, '../lib/onerror_page.mustache.html'),
  } as OnerrorConfig,
};
