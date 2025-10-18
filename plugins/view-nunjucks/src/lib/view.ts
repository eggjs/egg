import type { Context } from 'egg';
import type { createHelper } from './helper.ts';

/**
 * Nunjucks view class for rendering templates
 */
export class NunjucksView {
  ctx: Context;
  app: Context['app'];
  viewHelper: InstanceType<ReturnType<typeof createHelper>>;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.app = ctx.app;
    this.viewHelper = new this.app.nunjucks.ViewHelper(ctx);
  }

  /**
   * Render a template file
   * @param name - template name
   * @param locals - template locals
   * @returns rendered html string
   */
  render(name: string, locals: Record<string, any>): Promise<string> {
    locals.helper = this.viewHelper;
    return new Promise((resolve, reject) => {
      (this.app.nunjucks as any).render(name, locals, (err: Error | null, result?: string) => {
        if (err) return reject(err);
        resolve(result!);
      });
    });
  }

  /**
   * Render a template string
   * @param tpl - template string
   * @param locals - template locals
   * @param opts - render options
   * @returns rendered html string
   */
  renderString(tpl: string, locals: Record<string, any>, opts?: any): Promise<string> {
    locals.helper = this.viewHelper;
    return new Promise((resolve, reject) => {
      if (opts) {
        (this.app.nunjucks as any).renderString(tpl, locals, opts, (err: Error | null, result?: string) => {
          if (err) return reject(err);
          resolve(result!);
        });
      } else {
        (this.app.nunjucks as any).renderString(tpl, locals, (err: Error | null, result?: string) => {
          if (err) return reject(err);
          resolve(result!);
        });
      }
    });
  }
}
