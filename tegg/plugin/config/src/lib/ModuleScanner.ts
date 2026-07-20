import fs from 'node:fs';
import path from 'node:path';
import { debuglog } from 'node:util';

import { ModuleConfigUtil, type ModuleReference, type ReadModuleReferenceOptions } from '@eggjs/tegg-common-util';
import type { TeggManifest } from '@eggjs/tegg-types';
import { getFrameworkPath, importResolve } from '@eggjs/utils';

const debug = debuglog('egg/tegg/plugin/config/ModuleScanner');

interface WarnLogger {
  warn(message: string): void;
}

interface ModulePluginInfo {
  enable: boolean;
  package?: string;
  path?: string;
}

export interface ModulePluginOptions {
  allPlugins?: Readonly<Record<string, ModulePluginInfo>>;
  lookupDirs?: Iterable<string>;
}

export class ModuleScanner {
  private readonly baseDir: string;
  private readonly readModuleOptions: ReadModuleReferenceOptions;
  private readonly appReadModuleOptions: ReadModuleReferenceOptions;
  private readonly logger?: WarnLogger;
  private readonly modulePluginOptions?: ModulePluginOptions;

  constructor(
    baseDir: string,
    readModuleOptions: ReadModuleReferenceOptions,
    logger?: WarnLogger,
    appReadModuleOptions: ReadModuleReferenceOptions = readModuleOptions,
    modulePluginOptions?: ModulePluginOptions,
  ) {
    this.baseDir = baseDir;
    this.readModuleOptions = readModuleOptions;
    this.appReadModuleOptions = appReadModuleOptions;
    this.logger = logger;
    this.modulePluginOptions = modulePluginOptions;
  }

  private loadPluginModuleReferences(enabledOnly = false): readonly ModuleReference[] {
    const references: ModuleReference[] = [];
    for (const plugin of Object.values(this.modulePluginOptions?.allPlugins ?? {})) {
      if (enabledOnly && !plugin.enable) continue;

      let packageJsonPath: string | undefined;
      if (plugin.package) {
        try {
          packageJsonPath = importResolve(`${plugin.package}/package.json`, {
            paths: [...(this.modulePluginOptions?.lookupDirs ?? [])],
          });
        } catch {
          continue;
        }
      } else if (plugin.path) {
        const directPackageJsonPath = path.join(plugin.path, 'package.json');
        if (fs.existsSync(directPackageJsonPath)) {
          packageJsonPath = directPackageJsonPath;
        }
      }
      if (!packageJsonPath) continue;

      let pkg: { name?: string; eggModule?: { name?: string } };
      try {
        pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      } catch {
        continue;
      }
      if (!pkg.eggModule?.name) continue;

      references.push({
        name: pkg.eggModule.name,
        package: pkg.name,
        path: fs.realpathSync(path.dirname(packageJsonPath)),
        optional: true,
      });
    }
    return references;
  }

  validateManifestModulePlugins(manifest: TeggManifest): void {
    for (const pluginReference of this.loadPluginModuleReferences(true)) {
      const reference = manifest.moduleReferences.find((reference) => {
        if (pluginReference.package && reference.package) {
          return pluginReference.package === reference.package;
        }
        return pluginReference.path === reference.path;
      });
      if (!reference) {
        throw new Error(
          `[egg/tegg/plugin/config] manifest is missing enabled module plugin "${pluginReference.name}" (${pluginReference.package ?? pluginReference.path})`,
        );
      }
      const descriptor = manifest.moduleDescriptors?.find(
        (descriptor) => descriptor.unitPath === reference.path && descriptor.name === reference.name,
      );
      if (!descriptor) {
        throw new Error(
          `[egg/tegg/plugin/config] manifest is missing descriptor for enabled module plugin "${pluginReference.name}" (${reference.path})`,
        );
      }
    }
  }

  /**
   * Directory of THE framework the app runs on — its own package.json
   * dependencies declare the module plugins it ships. Resolved with the
   * canonical convention (`getFrameworkPath`): explicit `pkg.egg.framework`
   * first, default `egg` otherwise — so apps that declare nothing (e.g.
   * cnpmcore) still get the egg-shipped module plugins, and chair apps
   * (which declare their framework) automatically scan chair.
   */
  private resolveFrameworkDir(baseDir: string): string | undefined {
    try {
      return getFrameworkPath({ baseDir });
    } catch (err) {
      // No package.json or no resolvable framework next to the app (e.g.
      // bare unit fixtures without node_modules) — app modules only.
      debug(
        'resolve framework dir failed, baseDir: %s, err: %s',
        baseDir,
        err instanceof Error ? err.message : String(err),
      );
      return undefined;
    }
  }

  private resolveParentFrameworkDir(frameworkDir: string): string | undefined {
    let pkg: { egg?: { framework?: unknown } };
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(frameworkDir, 'package.json'), 'utf8'));
    } catch (err) {
      debug(
        'read framework package failed, frameworkDir: %s, err: %s',
        frameworkDir,
        err instanceof Error ? err.message : String(err),
      );
      return undefined;
    }
    const framework = pkg.egg?.framework;
    if (typeof framework !== 'string' || !framework) {
      return undefined;
    }
    return this.resolveFrameworkDir(frameworkDir);
  }

  private resolveFrameworkDirs(): readonly string[] {
    const frameworkDirs: string[] = [];
    const seen = new Set<string>();
    let frameworkDir = this.resolveFrameworkDir(this.baseDir);
    while (frameworkDir) {
      let canonicalFrameworkDir = frameworkDir;
      try {
        canonicalFrameworkDir = fs.realpathSync(frameworkDir);
      } catch {
        canonicalFrameworkDir = path.resolve(frameworkDir);
      }
      if (seen.has(canonicalFrameworkDir)) break;
      seen.add(canonicalFrameworkDir);
      frameworkDirs.push(frameworkDir);
      frameworkDir = this.resolveParentFrameworkDir(frameworkDir);
    }
    return frameworkDirs;
  }

  private readModuleReferences(baseDir: string, cwd?: string): readonly ModuleReference[] {
    const readModuleOptions = cwd ? this.readModuleOptions : this.appReadModuleOptions;
    return ModuleConfigUtil.readModuleReference(baseDir, {
      ...readModuleOptions,
      ...(cwd ? { cwd } : {}),
    });
  }

  // Same physical module reached via two different path strings — e.g. an app
  // inline module.json path (not realpath'd) vs the same module resolved from
  // node_modules with fs.realpathSync — must NOT warn. Compare realpaths, not
  // raw strings, so pnpm/symlinked layouts don't trigger a spurious duplicate.
  private static isSamePath(a: string, b: string): boolean {
    if (a === b) return true;
    try {
      return fs.realpathSync(a) === fs.realpathSync(b);
    } catch {
      return false;
    }
  }

  private warnDuplicateModuleName(kept: ModuleReference, skipped: ModuleReference): void {
    if (ModuleScanner.isSamePath(kept.path, skipped.path)) {
      return;
    }
    const message =
      `[egg/tegg/plugin/config] Duplicate module name "${skipped.name}" found while scanning module references, ` +
      `keep ${kept.path}, skip ${skipped.path}`;
    if (this.logger) {
      this.logger.warn(message);
    } else {
      debug(message);
    }
  }

  private deduplicateRootModuleReferences(moduleReferences: readonly ModuleReference[]): readonly ModuleReference[] {
    const result: ModuleReference[] = [];
    const pathMap = new Map<string, ModuleReference>();
    const nameMap = new Map<string, ModuleReference>();

    for (const moduleReference of moduleReferences) {
      let canonicalPath = moduleReference.path;
      try {
        canonicalPath = fs.realpathSync(moduleReference.path);
      } catch {
        // Keep the unresolved path. Missing optional modules are valid inputs.
      }

      const existingByPath = pathMap.get(canonicalPath);
      if (existingByPath) {
        if (existingByPath.optional === true && moduleReference.optional !== true) {
          const index = result.indexOf(existingByPath);
          const promoted = {
            ...existingByPath,
            ...(!existingByPath.package && moduleReference.package ? { package: moduleReference.package } : {}),
            optional: false,
          };
          result[index] = promoted;
          pathMap.set(canonicalPath, promoted);
          nameMap.set(existingByPath.name, promoted);
        }
        continue;
      }

      const existingByName = nameMap.get(moduleReference.name);
      if (existingByName) {
        throw new Error(
          `Duplicate module name "${moduleReference.name}" found: existing at ${existingByName.path}, duplicate at ${moduleReference.path}`,
        );
      }

      pathMap.set(canonicalPath, moduleReference);
      nameMap.set(moduleReference.name, moduleReference);
      result.push(moduleReference);
    }

    return result;
  }

  private deduplicateLayeredModuleReferences(
    moduleReferenceLayers: readonly (readonly ModuleReference[])[],
  ): readonly ModuleReference[] {
    const result: ModuleReference[] = [];
    const nameMap = new Map<string, ModuleReference>();

    for (const moduleReferences of moduleReferenceLayers) {
      for (const moduleReference of moduleReferences) {
        const existing = nameMap.get(moduleReference.name);
        if (existing) {
          this.warnDuplicateModuleName(existing, moduleReference);
          continue;
        }
        nameMap.set(moduleReference.name, moduleReference);
        result.push(moduleReference);
      }
    }

    return result;
  }

  /**
   * - load module references from config or scan from baseDir
   * - load the framework's module plugins as OPTIONAL references
   *   (plugin promotion flips the enabled ones to non-optional)
   */
  loadModuleReferences(): readonly ModuleReference[] {
    const appModuleReferences = this.deduplicateRootModuleReferences([
      ...this.readModuleReferences(this.baseDir),
      ...this.loadPluginModuleReferences(),
    ]);
    const frameworkDirs = this.resolveFrameworkDirs();
    debug('loadModuleReferences from frameworkDirs:%o', frameworkDirs);
    const frameworkModuleReferenceLayers = frameworkDirs.map((frameworkDir) =>
      this.deduplicateRootModuleReferences(
        this.readModuleReferences(frameworkDir, frameworkDir).map((ref) => ({ ...ref, optional: true })),
      ),
    );

    return this.deduplicateLayeredModuleReferences([appModuleReferences, ...frameworkModuleReferenceLayers]);
  }
}
