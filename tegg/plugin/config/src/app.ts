import fs from 'node:fs';
import path from 'node:path';
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
    // Auto-exclude outDir (e.g. dist/) from module scanning to avoid
    // duplicate modules when both source and compiled output exist
    const outDir = this.app.loader.outDir;
    if (outDir) {
      const extraFilePattern = readModuleOptions.extraFilePattern || [];
      const excludePattern = `!**/${outDir}`;
      if (!extraFilePattern.includes(excludePattern)) {
        readModuleOptions.extraFilePattern = [...extraFilePattern, excludePattern];
      }
    }
    const moduleScanner = new ModuleScanner(this.app.baseDir, readModuleOptions);
    let moduleReferences = moduleScanner.loadModuleReferences();

    // When outDir is configured and compiled output exists, rewrite module paths
    // from source (e.g. app/port/) to compiled output (e.g. dist/app/port/)
    // so that LoaderUtil can find .js files in production mode
    if (outDir) {
      moduleReferences = this.#rewriteModulePaths(moduleReferences, outDir);
    }

    this.app.moduleReferences = moduleReferences;
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

  #rewriteModulePaths(refs: readonly ModuleReference[], outDir: string): readonly ModuleReference[] {
    const baseDir = this.app.baseDir;
    return refs.map((ref) => {
      // Only rewrite paths inside baseDir (not node_modules etc.)
      if (!ref.path.startsWith(baseDir + path.sep)) return ref;
      const relativePath = path.relative(baseDir, ref.path);
      // Skip if already under outDir
      if (relativePath.startsWith(outDir + path.sep)) return ref;
      const outDirPath = path.join(baseDir, outDir, relativePath);
      if (fs.existsSync(outDirPath)) {
        debug('rewrite module path: %o => %o', ref.path, outDirPath);
        return { ...ref, path: outDirPath };
      }
      return ref;
    });
  }

  async beforeClose(): Promise<void> {
    ModuleConfigUtil.setConfigNames(undefined);
  }
}
