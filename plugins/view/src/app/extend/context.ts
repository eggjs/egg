import { Context } from 'egg';

import { ContextView } from '../../lib/context_view.ts';
import { type RenderOptions } from '../../lib/view_manager.ts';

const VIEW = Symbol('Context#view');

export default class ViewContext extends Context {
  [VIEW]: ContextView;

  /**
   * Render a file by view engine, then set to body
   * @param {String} name - the file path based on root
   * @param {Object} [locals] - data used by template
   * @param {Object} [options] - view options, you can use `options.viewEngine` to specify view engine
   */
  async render(name: string, locals?: Record<string, any>, options?: RenderOptions): Promise<void> {
    const body = await this.renderView(name, locals, options);
    this.body = body;
  }

  /**
   * Render a file by view engine and return it
   * @param {String} name - the file path based on root
   * @param {Object} [locals] - data used by template
   * @param {Object} [options] - view options, you can use `options.viewEngine` to specify view engine
   * @return {Promise<String>} result - return a promise with a render result
   */
  async renderView(name: string, locals?: Record<string, any>, options?: RenderOptions): Promise<string> {
    return await this.view.render(name, locals, options);
  }

  /**
   * Render template string by view engine and return it
   * @param {String} tpl - template string
   * @param {Object} [locals] - data used by template
   * @param {Object} [options] - view options, you can use `options.viewEngine` to specify view engine
   * @return {Promise<String>} result - return a promise with a render result
   */
  async renderString(tpl: string, locals?: Record<string, any>, options?: RenderOptions): Promise<string> {
    return await this.view.renderString(tpl, locals, options);
  }

  /**
   * View instance that is created every request
   * @member {ContextView} Context#view
   */
  get view() {
    if (!this[VIEW]) {
      this[VIEW] = new ContextView(this);
    }
    return this[VIEW];
  }
}
