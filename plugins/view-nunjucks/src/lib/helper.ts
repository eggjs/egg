import type { Application, Context } from 'egg';

type BuildInFilters = Record<string, any>;

// Define the return type of createHelper
type HelperClass = new (ctx: Context) => any;

/**
 * Create NunjucksViewHelper class
 * @param app - application instance
 * @param buildInFilters - nunjucks built-in filters
 * @returns NunjucksViewHelper class
 */
export function createHelper(app: Application, buildInFilters: BuildInFilters): HelperClass {
  /**
   * NunjucksViewHelper extends {@link Helper} for nunjucks templates.
   * Wrap some helpers for safe string, and transform build-in filters to helpers
   */
  class NunjucksViewHelper extends app.Helper {
    constructor(ctx: Context) {
      super(ctx);
    }

    /**
     * See {@link Helper#shtml}
     * @param str - the string that will be transformed to safe html
     * @return the result
     */
    shtml(str: string): any {
      return this.safe(super.shtml(str));
    }

    /**
     * See {@link Helper#surl}
     * @param str - the string that will be transformed to safe url
     * @return the result
     */
    surl(str: string): any {
      return this.safe(super.surl(str));
    }

    /**
     * See {@link Helper#sjs}
     * @param str - the string that will be transformed to safe js
     * @return the result
     */
    sjs(str: string): any {
      return this.safe(super.sjs(str));
    }

    /**
     * don't use `super.helper.escape` directly due to `SafeString` checking
     * see https://github.com/mozilla/nunjucks/blob/master/src/filters.js#L119
     * buildInFilters.escape is `nunjucks.filters.escape` which will call `nunjucks.lib.escape`
     * and `nunjucks.lib.escape` is overrided by `app.Helper.escape` for better performance
     * @param str - the string that will be escaped
     * @return the result
     */
    escape(str: string): string {
      return buildInFilters.escape(str);
    }

    /**
     * get hidden filed for `csrf`
     * @return html string
     */
    csrfTag(): any {
      return this.safe(`<input type="hidden" name="_csrf" value="${this.ctx.csrf}" />`);
    }
  }

  // fill view helper with nunjucks build-in filters
  for (const key in buildInFilters) {
    if ((NunjucksViewHelper.prototype as any)[key] == null) {
      (NunjucksViewHelper.prototype as any)[key] = buildInFilters[key];
    }
  }

  return NunjucksViewHelper as HelperClass;
}
