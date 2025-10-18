import { debuglog } from 'node:util';

import type { Application, ILifecycleBoot } from 'egg';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import type { ModuleReference, ModuleConfigHolder } from '@eggjs/tegg-common-util';

import { ModuleScanner } from './lib/ModuleScanner.ts';

const debug = debuglog('tegg/plugin/config/app');

export default class App implements ILifecycleBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
    const configNames = this.app.loader.getTypeFiles('module');
    ModuleConfigUtil.setConfigNames(configNames);
  }

  configWillLoad() {
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

  async beforeClose() {
    ModuleConfigUtil.setConfigNames(undefined);
  }
}

declare module 'egg' {
  // export type ModuleReference = ModuleReferenceAlias;

  interface ModuleConfig {}

  // interface ModuleConfigHolder {
  //   name: string;
  //   config: ModuleConfig;
  //   reference: ModuleReference;
  // }

  // interface ModuleConfigApplication {
  //   moduleReferences: readonly ModuleReference[];
  //   moduleConfigs: Record<string, ModuleConfigHolder>;
  // }

  interface EggApplicationCore {
    moduleReferences: readonly ModuleReference[];
    moduleConfigs: Record<string, ModuleConfigHolder>;
  }
}
