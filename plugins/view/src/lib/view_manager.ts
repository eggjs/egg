import assert from 'node:assert';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { exists } from 'utility';
import type { Context, EggCore } from '@eggjs/core';
import { isGeneratorFunction } from 'is-type-of';
import type { ViewConfig } from '../config/config.default.js';

export interface ViewManagerConfig extends Omit<ViewConfig, 'root'> {
  root: string[];
}

export type PlainObject<T = any> = { [key: string]: T };

export interface RenderOptions extends PlainObject {
  name?: string;
  root?: string;
  locals?: PlainObject;
  viewEngine?: string;
}

export interface ViewEngine {
  render: (name: string, locals?: Record<string, any>, options?: RenderOptions) => Promise<string>;
  renderString: (tpl: string, locals?: Record<string, any>, options?: RenderOptions) => Promise<string>;
}

export type ViewEngineClass = new (app: Context) => ViewEngine;

/**
 * ViewManager will manage all view engine that is registered.
 *
 * It can find the real file, then retrieve the view engine based on extension.
 * The plugin just register view engine using {@link ViewManager#use}
 */
export class ViewManager extends Map<string, ViewEngineClass> {
  config: ViewManagerConfig;
  extMap: Map<string, string>;
  fileMap: Map<string, string>;

  /**
   * @param {Application} app - application instance
   */
  constructor(app: EggCore) {
    super();
    this.config = app.config.view as any;
    this.config.root = app.config.view.root.split(/\s*,\s*/g).filter(filepath => existsSync(filepath));
    this.extMap = new Map();
    this.fileMap = new Map();
    for (const ext of Object.keys(this.config.mapping)) {
      this.extMap.set(ext, this.config.mapping[ext]);
    }
  }

  /**
   * This method can register view engine.
   *
   * You can define a view engine class contains two method, `render` and `renderString`
   *
   * ```js
   * class View {
   *   render() {}
   *   renderString() {}
   * }
   * ```
   * @param {String} name - the name of view engine
   * @param {Object} viewEngine - the class of view engine
   */
  use(name: string, viewEngine: ViewEngineClass) {
    assert(name, 'name is required');
    assert(!this.has(name), `${name} has been registered`);

    assert(viewEngine, 'viewEngine is required');
    assert(viewEngine.prototype.render, 'viewEngine should implement `render` method');
    assert(
      !isGeneratorFunction(viewEngine.prototype.render),
      'viewEngine `render` method should not be generator function'
    );
    assert(viewEngine.prototype.renderString, 'viewEngine should implement `renderString` method');
    assert(
      !isGeneratorFunction(viewEngine.prototype.renderString),
      'viewEngine `renderString` method should not be generator function'
    );

    this.set(name, viewEngine);
  }

  /**
   * Resolve the path based on the given name,
   * if the name is `user.html` and root is `app/view` (by default),
   * it will return `app/view/user.html`
   * @param {String} name - the given path name, it's relative to config.root
   * @return {String} filename - the full path
   */
  async resolve(name: string): Promise<string> {
    const config = this.config;

    // check cache
    let filename = this.fileMap.get(name);
    if (config.cache && filename) return filename;

    // try find it with default extension
    filename = await resolvePath([name, name + config.defaultExtension], config.root);
    assert(filename, `Can't find ${name} from ${config.root.join(',')}`);

    // set cache
    this.fileMap.set(name, filename);
    return filename;
  }
}

async function resolvePath(names: string[], root: string[]) {
  for (const name of names) {
    for (const dir of root) {
      const filename = path.join(dir, name);
      if (await exists(filename)) {
        if (inpath(dir, filename)) {
          return filename;
        }
      }
    }
  }
}

function inpath(parent: string, sub: string) {
  return sub.indexOf(parent) > -1;
}
