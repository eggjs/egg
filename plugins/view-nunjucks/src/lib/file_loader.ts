import { FileSystemLoader } from 'nunjucks';
import type { Application } from 'egg';

/**
 * Extended nunjucks FileSystemLoader, will auto inject csrf && nonce
 */
export class NunjucksFileLoader extends FileSystemLoader {
  private app: Application;

  /**
   * @param app - application instance
   */
  constructor(app: Application) {
    super(app.config.view.root, { noCache: app.config.nunjucks.noCache });
    this.app = app;
  }

  /**
   * Override getSource {@link https://mozilla.github.io/nunjucks/api.html#writing-a-loader},
   * inject csrfTag and nonce
   * @param name - the name of the template
   * @return html
   */
  override getSource(name: string): any {
    const result = super.getSource(name);
    /* istanbul ignore else */
    if (result) {
      const config = this.app.config.security;
      // auto inject `_csrf` attr to form field, rely on `app.injectCsrf` provided by `security` plugin
      if (!(config.csrf === false || config.csrf.enable === false)) {
        result.src = this.app.injectCsrf(result.src);
      }
      // auto inject `nonce` attr to script tag, rely on `app.injectNonce` provided by `security` plugin
      if (!(config.csp === false || config.csp.enable === false)) {
        result.src = this.app.injectNonce(result.src);
      }
    }
    return result;
  }
}
