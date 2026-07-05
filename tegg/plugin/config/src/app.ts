import fs from 'node:fs';
import path from 'node:path';
import { debuglog } from 'node:util';

import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import type { ModuleReference } from '@eggjs/tegg-common-util';
import { TEGG_MANIFEST_KEY } from '@eggjs/tegg-loader';
import type { TeggManifestExtension } from '@eggjs/tegg-loader';
import { TeggScope, type TeggScopeBag } from '@eggjs/tegg-types';
import type { Application, ILifecycleBoot } from 'egg';

import { ModuleScanner } from './lib/ModuleScanner.ts';

const debug = debuglog('egg/tegg/plugin/config/app');

// `_teggScopeBag` is declared by the tegg plugin's type augmentation, which this
// (lower-layer) plugin does not import; carry the shape locally instead.
type AppWithScope = Application & { _teggScopeBag?: TeggScopeBag };

export default class App implements ILifecycleBoot {
  private readonly app: AppWithScope;

  constructor(app: Application) {
    this.app = app as AppWithScope;
    // teggConfig boots BEFORE the tegg plugin (tegg depends on teggConfig), so it
    // is the FIRST tegg lifecycle to touch the per-app scoped `configNames`. The
    // tegg plugin owns `app._teggScopeBag` but only creates it in its own
    // configWillLoad — too late for the read in `#loadModuleConfigs` below. Create
    // the bag here if absent (the tegg plugin reuses it via `??=`) and run every
    // configNames access inside it; otherwise, under concurrent multi-app boot,
    // the access escapes to the process-default bag and the strict-mode fuse
    // throws (cross-talk between apps).
    this.app._teggScopeBag ??= TeggScope.createBag();
    TeggScope.run(this.app._teggScopeBag, () => {
      const configNames = this.app.loader.getTypeFiles('module');
      ModuleConfigUtil.setConfigNames(configNames);
    });
  }

  configWillLoad(): void {
    TeggScope.runMaybe(this.app._teggScopeBag, () => {
      this.#scanModuleReferences();
      this.#loadModuleConfigs();
    });
  }

  async loadMetadata(): Promise<void> {
    TeggScope.runMaybe(this.app._teggScopeBag, () => {
      this.#scanModuleReferences();
      this.#loadModuleConfigs();
    });
  }

  #scanModuleReferences(): void {
    const { readModuleOptions } = this.app.config.tegg;

    // Try to use manifest for module references (skip expensive globby scan)
    const manifest = this.app.loader.manifest;
    const manifestTegg = manifest.getExtension(TEGG_MANIFEST_KEY) as TeggManifestExtension | undefined;

    let moduleReferences: readonly ModuleReference[];
    if (manifestTegg?.moduleReferences?.length) {
      // Keep manifest reference paths as-is (relative to baseDir) so they match
      // the manifest `moduleDescriptors[].unitPath` keys used by
      // `LoaderFactory.loadApp`. Path resolution to an absolute directory is done
      // in `#loadModuleConfigs` below.
      moduleReferences = manifestTegg.moduleReferences;
      debug('load moduleReferences from manifest: %o', moduleReferences);
    } else {
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
      const moduleScanner = new ModuleScanner(this.app.baseDir, {
        ...readModuleOptions,
        // egg already resolved the real framework (mm option / egg-scripts);
        // framework dependencies declaring eggModule join the scan as
        // OPTIONAL modules, promoted when their plugin is enabled.
        frameworkDir: (this.app.options as { framework?: string } | undefined)?.framework,
      });
      moduleReferences = moduleScanner.loadModuleReferences();

      if (outDir) {
        moduleReferences = this.#rewriteModulePaths(moduleReferences, outDir);
      }
    }

    this.app.moduleReferences = moduleReferences;
    debug('load moduleReferences: %o', this.app.moduleReferences);
  }

  #loadModuleConfigs(): void {
    this.app.moduleConfigs = {};
    for (const reference of this.app.moduleReferences) {
      // Module reference paths from the manifest / ModuleScanner are absolute or
      // relative to baseDir. `ModuleConfigUtil.resolveModuleDir` resolves a
      // relative path against `baseDir/config` (the `config/module.json`
      // convention), which is wrong here, so resolve against baseDir directly. In
      // bundle mode baseDir is the output dir where the bundler copied each
      // module's package.json.
      const absoluteRef: ModuleReference = {
        path: path.isAbsolute(reference.path) ? reference.path : path.resolve(this.app.baseDir, reference.path),
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
    TeggScope.runMaybe(this.app._teggScopeBag, () => {
      ModuleConfigUtil.setConfigNames(undefined);
    });
  }
}
