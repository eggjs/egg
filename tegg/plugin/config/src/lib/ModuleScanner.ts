import fs from 'node:fs';
import path from 'node:path';
import { debuglog } from 'node:util';

import { ModuleConfigUtil, type ModuleReference, type ReadModuleReferenceOptions } from '@eggjs/tegg-common-util';
import { getFrameworkPath } from '@eggjs/utils';

const debug = debuglog('egg/tegg/plugin/config/ModuleScanner');

interface WarnLogger {
  warn(message: string): void;
}

export class ModuleScanner {
  private readonly baseDir: string;
  private readonly readModuleOptions: ReadModuleReferenceOptions;
  private readonly appReadModuleOptions: ReadModuleReferenceOptions;
  private readonly logger?: WarnLogger;

  constructor(
    baseDir: string,
    readModuleOptions: ReadModuleReferenceOptions,
    logger?: WarnLogger,
    appReadModuleOptions: ReadModuleReferenceOptions = readModuleOptions,
  ) {
    this.baseDir = baseDir;
    this.readModuleOptions = readModuleOptions;
    this.appReadModuleOptions = appReadModuleOptions;
    this.logger = logger;
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
    while (frameworkDir && !seen.has(frameworkDir)) {
      seen.add(frameworkDir);
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

  private deduplicateLayeredModuleReferences(moduleReferences: readonly ModuleReference[]): readonly ModuleReference[] {
    const result: ModuleReference[] = [];
    const nameMap = new Map<string, ModuleReference>();

    for (const moduleReference of moduleReferences) {
      const existing = nameMap.get(moduleReference.name);
      if (existing) {
        this.warnDuplicateModuleName(existing, moduleReference);
        continue;
      }
      nameMap.set(moduleReference.name, moduleReference);
      result.push(moduleReference);
    }

    return result;
  }

  /**
   * - load module references from config or scan from baseDir
   * - load the framework's module plugins as OPTIONAL references
   *   (plugin promotion flips the enabled ones to non-optional)
   */
  loadModuleReferences(): readonly ModuleReference[] {
    const moduleReferences = this.readModuleReferences(this.baseDir);
    const frameworkDirs = this.resolveFrameworkDirs();
    debug('loadModuleReferences from frameworkDirs:%o', frameworkDirs);
    const optionalModuleReferences = frameworkDirs.flatMap((frameworkDir) =>
      this.readModuleReferences(frameworkDir, frameworkDir),
    );

    // Merge all module references and deduplicate
    const allModuleReferences = [
      ...moduleReferences,
      ...optionalModuleReferences.map((ref) => ({ ...ref, optional: true })),
    ];

    return this.deduplicateLayeredModuleReferences(allModuleReferences);
  }
}
