import path from 'node:path';

import type { Application } from 'egg';
import nunjucks from 'nunjucks';

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

    // monkey patch `escape` with `app.Helper.prototype.escape` provided by `egg-security` for better performance
    (nunjucks.lib as any).escape = app.Helper.prototype.escape;

    // http://disse.cting.org/2016/08/02/2016-08-02-sandbox-break-out-nunjucks-template-engine
    // @ts-expect-error missing memberLookup type definition
    const originMemberLookup = nunjucks.runtime.memberLookup;
    // @ts-expect-error missing memberLookup type definition
    nunjucks.runtime.memberLookup = function (...args: any[]): any {
      const val = args[1];
      if (val === 'prototype' || val === 'constructor') return null;
      return originMemberLookup(...args);
    };

    // @ts-expect-error missing filters type definition
    this.ViewHelper = createHelper(app, this.filters);
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

  async ready(): Promise<void> {
    await this.loadFilter();
  }

  // load `app/extend/filter.js` from app/framework/plugin into nunjucks
  private async loadFilter(): Promise<void> {
    for (const unit of this.app.loader.getLoadUnits()) {
      const filterPath = this.app.loader.resolveModule(path.join(unit.path, 'app/extend/filter'));
      if (!filterPath) continue;
      const filters = await this.app.loader.loadFile(filterPath);
      if (!filters) continue;
      const filterKeys = Object.keys(filters);
      for (const key of filterKeys) {
        this.addFilter(key, filters[key]);
      }
      this.app.coreLogger.info('[@eggjs/view-nunjucks] load filter %j from %s', filterKeys, filterPath);
    }
  }
}
