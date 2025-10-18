import path from 'node:path';
import nunjucks from 'nunjucks';
import type { Application } from 'egg';
import { NunjucksFileLoader } from './file_loader.ts';
import { createHelper } from './helper.ts';

/**
 * Extend nunjucks environment, see {@link https://mozilla.github.io/nunjucks/api.html#environment}
 */
export class NunjucksEnvironment extends nunjucks.Environment {
  app: Application;
  ViewHelper: ReturnType<typeof createHelper>;

  constructor(app: Application) {
    const fileLoader = new NunjucksFileLoader(app);
    super(fileLoader as any, app.config.nunjucks);

    this.app = app;

    this.loadFilter();

    // monkey patch `escape` with `app.Helper.prototype.escape` provided by `egg-security` for better performance
    (nunjucks.lib as any).escape = app.Helper.prototype.escape;

    // http://disse.cting.org/2016/08/02/2016-08-02-sandbox-break-out-nunjucks-template-engine
    const originMemberLookup = (nunjucks.runtime as any).memberLookup;
    (nunjucks.runtime as any).memberLookup = function (...args: any[]): any {
      const val = args[1];
      if (val === 'prototype' || val === 'constructor') return null;
      return originMemberLookup(...args);
    };

    this.ViewHelper = createHelper(app, (this as any).filters);
  }

  /**
   * clean template cache
   * @param name - full path
   * @return clean count
   */
  cleanCache(name?: string): number {
    let count = 0;
    const loaders = (this as any).loaders;
    for (const loader of loaders) {
      if (name) {
        // support full path && tpl name
        /* istanbul ignore else */
        if ((loader as any).cache[name]) {
          count++;
          (loader as any).cache[name] = null;
        }
      } else {
        for (const cacheName in (loader as any).cache) {
          count++;
          (loader as any).cache[cacheName] = null;
        }
      }
    }
    return count;
  }

  // load `app/extend/filter.js` from app/framework/plugin into nunjucks
  private loadFilter(): void {
    for (const unit of this.app.loader.getLoadUnits()) {
      const filterPath = resolveModule(path.join(unit.path, 'app/extend/filter'));
      if (!filterPath) continue;
      const filters = this.app.loader.loadFile(filterPath) || {};
      const filterKeys = Object.keys(filters);
      for (const key of filterKeys) {
        this.addFilter(key, (filters as any)[key]);
      }
    }
  }
}

function resolveModule(filepath: string): string | undefined {
  try {
    return require.resolve(filepath);
  } catch {
    return undefined;
  }
}
