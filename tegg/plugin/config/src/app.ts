import { debuglog } from 'node:util';

import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import type { ModuleReference } from '@eggjs/tegg-common-util';
import type { Application, ILifecycleBoot } from 'egg';

import { ModuleScanner } from './lib/ModuleScanner.ts';

const debug = debuglog('egg/tegg/plugin/config/app');

export default class App implements ILifecycleBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
    const configNames = this.app.loader.getTypeFiles('module');
    ModuleConfigUtil.setConfigNames(configNames);
  }

  configWillLoad(): void {
    const { readModuleOptions } = this.app.config.tegg;
    const moduleScanner = new ModuleScanner(this.app.baseDir, readModuleOptions);
    this.app.moduleReferences = moduleScanner.loadModuleReferences();
    debug('load moduleReferences: %o', this.app.moduleReferences);

    this.app.moduleConfigs = {};
    for (const reference of this.app.moduleReferences) {
      const absoluteRef: ModuleReference = {
        path: ModuleConfigUtil.resolveModuleDir(reference.path, this.app.baseDir),
        name: reference.name,
        optional: reference.optional,
      };

      const moduleName = ModuleConfigUtil.readModuleNameSync(absoluteRef.path);
      this.app.moduleConfigs[moduleName] = {
        name: moduleName,
        reference: absoluteRef,
        config: ModuleConfigUtil.loadModuleConfigSync(absoluteRef.path),
      };
    }

    debug('load moduleConfigs: %o', this.app.moduleConfigs);
  }

  async beforeClose(): Promise<void> {
    ModuleConfigUtil.setConfigNames(undefined);
  }
}
