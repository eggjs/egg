import type { ViewConfig } from './config/config.default.ts';
import type { ContextView } from './lib/context_view.ts';
import type { RenderOptions, ViewManager } from './lib/view_manager.ts';

declare module 'egg' {
  // add EggAppConfig overrides types
  interface EggAppConfig {
    /**
     * view default config
     * @member Config#view
     * @property {String} [root=${baseDir}/app/view] - give a path to find the file, you can specify multiple path with `,` delimiter
     * @property {Boolean} [cache=true] - whether cache the file's path
     * @property {String} [defaultExtension] - defaultExtension can be added automatically when there is no extension  when call `ctx.render`
     * @property {String} [defaultViewEngine] - set the default view engine if you don't want specify the viewEngine every request.
     * @property {Object} mapping - map the file extension to view engine, such as `{ '.ejs': 'ejs' }`
     */
    view: ViewConfig;
  }

  interface Application {
    get view(): ViewManager;
  }

  interface Context {
    view: ContextView;
    render(name: string, locals?: Record<string, any>, options?: RenderOptions): Promise<void>;
    renderView(name: string, locals?: Record<string, any>, options?: RenderOptions): Promise<string>;
    renderString(tpl: string, locals?: Record<string, any>, options?: RenderOptions): Promise<string>;
  }
}
