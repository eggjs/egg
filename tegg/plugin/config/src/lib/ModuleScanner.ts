import { readFileSync } from 'node:fs';
import path from 'node:path';
import { debuglog } from 'node:util';

import { ModuleConfigUtil, type ModuleReference, type ReadModuleReferenceOptions } from '@eggjs/tegg-common-util';
import { importResolve } from '@eggjs/utils';

const debug = debuglog('egg/tegg/plugin/config/ModuleScanner');

export interface ModuleScannerOptions extends ReadModuleReferenceOptions {
  /**
   * The RUNTIME framework directory (egg resolves it from options.framework /
   * mm). Preferred over re-deriving from `appPkg.egg.framework`, which is
   * absent in test harnesses and custom launches.
   */
  frameworkDir?: string;
}

export class ModuleScanner {
  private readonly baseDir: string;
  private readonly readModuleOptions: ModuleScannerOptions;

  constructor(baseDir: string, readModuleOptions: ModuleScannerOptions) {
    this.baseDir = baseDir;
    this.readModuleOptions = readModuleOptions;
  }

  /**
   * - load module references from config or scan from baseDir
   * - load framework module as optional module reference
   */
  loadModuleReferences(): readonly ModuleReference[] {
    const moduleReferences = ModuleConfigUtil.readModuleReference(this.baseDir, this.readModuleOptions || {});
    let frameworkDir = this.readModuleOptions?.frameworkDir;
    if (!frameworkDir) {
      const appPkg: { egg?: { framework?: string } } = JSON.parse(
        readFileSync(path.join(this.baseDir, 'package.json'), 'utf-8'),
      );
      const framework = appPkg.egg?.framework;
      if (!framework) {
        return ModuleConfigUtil.deduplicateModules(moduleReferences);
      }
      const frameworkPkg = importResolve(`${framework}/package.json`, {
        paths: [this.baseDir],
      });
      frameworkDir = path.dirname(frameworkPkg);
    }
    debug('loadModuleReferences frameworkDir:%o', frameworkDir);
    const optionalModuleReferences = ModuleConfigUtil.readModuleReference(frameworkDir, this.readModuleOptions || {});

    // Merge all module references and deduplicate
    const allModuleReferences = [
      ...moduleReferences,
      ...optionalModuleReferences.map((ref) => ({ ...ref, optional: true })),
    ];

    return ModuleConfigUtil.deduplicateModules(allModuleReferences);
  }
}
