import type { Context } from 'egg';

import type { OnerrorError, OnerrorOptions } from '../lib/onerror.ts';

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
   * Custom template path. If empty, uses the built-in error page template.
   *
   * Default: `''`
   */
  templatePath: string;
}

export default {
  onerror: {
    errorPageUrl: '',
    appErrorFilter: undefined,
    templatePath: '',
  } as OnerrorConfig,
};
