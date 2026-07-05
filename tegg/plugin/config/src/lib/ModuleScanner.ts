import { readFileSync } from 'node:fs';
import path from 'node:path';
import { debuglog } from 'node:util';

import { ModuleConfigUtil, type ModuleReference, type ReadModuleReferenceOptions } from '@eggjs/tegg-common-util';
import { importResolve } from '@eggjs/utils';

const debug = debuglog('egg/tegg/plugin/config/ModuleScanner');

export class ModuleScanner {
  private readonly baseDir: string;
  private readonly readModuleOptions: ReadModuleReferenceOptions;

  constructor(baseDir: string, readModuleOptions: ReadModuleReferenceOptions) {
    this.baseDir = baseDir;
    this.readModuleOptions = readModuleOptions;
  }

  /**
   * - load module references from config or scan from baseDir
   * - load framework module as optional module reference
   */
  loadModuleReferences(): readonly ModuleReference[] {
    const moduleReferences = ModuleConfigUtil.readModuleReference(this.baseDir, this.readModuleOptions || {});
    const appPkg: { egg?: { framework?: string } } = JSON.parse(
      readFileSync(path.join(this.baseDir, 'package.json'), 'utf-8'),
    );
    // Same convention as egg-core: apps on a custom framework declare it in
    // pkg.egg.framework; apps on the base framework declare nothing — default
    // to `egg` so framework-shipped module plugins (aop/dal/config) are still
    // discovered.
    const framework = appPkg.egg?.framework ?? 'egg';
    let frameworkPkg: string;
    try {
      frameworkPkg = importResolve(`${framework}/package.json`, {
        paths: [this.baseDir],
      });
    } catch {
      // No resolvable framework package next to the app (e.g. unit fixtures
      // without node_modules) — app modules only.
      return ModuleConfigUtil.deduplicateModules(moduleReferences);
    }
    const frameworkDir = path.dirname(frameworkPkg);
    debug('loadModuleReferences from framework:%o, frameworkDir:%o', framework, frameworkDir);
    const optionalModuleReferences = ModuleConfigUtil.readModuleReference(frameworkDir, this.readModuleOptions || {});

    // Merge all module references and deduplicate
    const allModuleReferences = [
      ...moduleReferences,
      ...optionalModuleReferences.map((ref) => ({ ...ref, optional: true })),
    ];

    return ModuleConfigUtil.deduplicateModules(allModuleReferences);
  }
}
