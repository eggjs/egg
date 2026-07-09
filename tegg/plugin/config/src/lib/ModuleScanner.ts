import { debuglog } from 'node:util';

import { ModuleConfigUtil, type ModuleReference, type ReadModuleReferenceOptions } from '@eggjs/tegg-common-util';
import { getFrameworkPath } from '@eggjs/utils';

const debug = debuglog('egg/tegg/plugin/config/ModuleScanner');

export class ModuleScanner {
  private readonly baseDir: string;
  private readonly readModuleOptions: ReadModuleReferenceOptions;

  constructor(baseDir: string, readModuleOptions: ReadModuleReferenceOptions) {
    this.baseDir = baseDir;
    this.readModuleOptions = readModuleOptions;
  }

  /**
   * Directory of THE framework the app runs on — its own package.json
   * dependencies declare the module plugins it ships. Resolved with the
   * canonical convention (`getFrameworkPath`): explicit `pkg.egg.framework`
   * first, default `egg` otherwise — so apps that declare nothing (e.g.
   * cnpmcore) still get the egg-shipped module plugins, and chair apps
   * (which declare their framework) automatically scan chair.
   */
  private resolveFrameworkDir(): string | undefined {
    try {
      return getFrameworkPath({ baseDir: this.baseDir });
    } catch (err) {
      // No package.json or no resolvable framework next to the app (e.g.
      // bare unit fixtures without node_modules) — app modules only.
      debug(
        'resolve framework dir failed, baseDir: %s, err: %s',
        this.baseDir,
        err instanceof Error ? err.message : String(err),
      );
      return undefined;
    }
  }

  /**
   * - load module references from config or scan from baseDir
   * - load the framework's module plugins as OPTIONAL references
   *   (plugin promotion flips the enabled ones to non-optional)
   */
  loadModuleReferences(): readonly ModuleReference[] {
    const moduleReferences = ModuleConfigUtil.readModuleReference(this.baseDir, this.readModuleOptions || {});
    const frameworkDir = this.resolveFrameworkDir();
    if (!frameworkDir) {
      return ModuleConfigUtil.deduplicateModules(moduleReferences);
    }
    debug('loadModuleReferences from frameworkDir:%o', frameworkDir);
    const optionalModuleReferences = ModuleConfigUtil.readModuleReference(frameworkDir, this.readModuleOptions || {});

    // Merge all module references and deduplicate
    const allModuleReferences = [
      ...moduleReferences,
      ...optionalModuleReferences.map((ref) => ({ ...ref, optional: true })),
    ];

    return ModuleConfigUtil.deduplicateModules(allModuleReferences);
  }
}
