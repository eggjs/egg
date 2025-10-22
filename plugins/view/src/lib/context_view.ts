import path from 'node:path';
import assert from 'node:assert';

import type { Context, Application } from 'egg';

import { ViewManager, type ViewManagerConfig, type RenderOptions, ViewEngineBase } from './view_manager.ts';

/**
 * View instance for each request.
 *
 * It will find the view engine, and render it.
 * The view engine should be registered in {@link ViewManager}.
 */
export class ContextView {
  protected ctx: Context;
  protected app: Application;
  protected viewManager: ViewManager;
  protected config: ViewManagerConfig;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.app = this.ctx.app;
    this.viewManager = this.app.view;
    this.config = this.app.view.config;
  }

  /**
   * Render a file by view engine
   * @param {String} name - the file path based on root
   * @param {Object} [locals] - data used by template
   * @param {Object} [options] - view options, you can use `options.viewEngine` to specify view engine
   * @return {Promise<String>} result - return a promise with a render result
   */
  async render(name: string, locals?: Record<string, any>, options?: RenderOptions): Promise<string> {
    return await this._render(name, locals, options);
  }

  /**
   * Render a template string by view engine
   * @param {String} tpl - template string
   * @param {Object} [locals] - data used by template
   * @param {Object} [options] - view options, you can use `options.viewEngine` to specify view engine
   * @return {Promise<String>} result - return a promise with a render result
   */
  async renderString(tpl: string, locals?: Record<string, any>, options?: RenderOptions): Promise<string> {
    return await this._renderString(tpl, locals, options);
  }

  // ext -> viewEngineName -> viewEngine
  private async _render(name: string, locals?: Record<string, any>, options: RenderOptions = {}): Promise<string> {
    // retrieve fullpath matching name from `config.root`
    const filename = await this.viewManager.resolve(name);
    options.name = name;
    options.root = filename.replace(path.normalize(name), '').replace(/[/\\]$/, '');
    options.locals = locals;

    // get the name of view engine,
    // if viewEngine is specified in options, don't match extension
    let viewEngineName = options.viewEngine;
    if (!viewEngineName) {
      const ext = path.extname(filename);
      viewEngineName = this.viewManager.extMap.get(ext);
    }
    // use the default view engine that is configured if no matching above
    if (!viewEngineName) {
      viewEngineName = this.config.defaultViewEngine;
    }
    assert(viewEngineName, `Can't find viewEngine for ${filename}`);

    // get view engine and render
    const viewEngine = this._getViewEngine(viewEngineName);
    return await viewEngine.render(filename, this._setLocals(locals), options);
  }

  private async _renderString(tpl: string, locals?: Record<string, any>, options?: RenderOptions): Promise<string> {
    let viewEngineName = options && options.viewEngine;
    if (!viewEngineName) {
      viewEngineName = this.config.defaultViewEngine;
    }
    assert(viewEngineName, "Can't find viewEngine");

    // get view engine and render
    const viewEngine = this._getViewEngine(viewEngineName);
    return await viewEngine.renderString(tpl, this._setLocals(locals), options);
  }

  private _getViewEngine(name: string): ViewEngineBase {
    // get view engine
    const ViewEngineImpl = this.viewManager.get(name);
    assert(ViewEngineImpl, `Can't find ViewEngine "${name}"`);

    // use view engine to render
    const engine = Reflect.construct(ViewEngineImpl, [this.ctx]);
    return engine as ViewEngineBase;
  }

  /**
   * set locals for view, inject `locals.ctx`, `locals.request`, `locals.helper`
   * @private
   */
  private _setLocals(locals?: Record<string, any>): Record<string, any> {
    return Object.assign(
      {
        ctx: this.ctx,
        request: this.ctx.request,
        helper: this.ctx.helper,
      },
      this.ctx.locals,
      locals,
    );
  }
}
