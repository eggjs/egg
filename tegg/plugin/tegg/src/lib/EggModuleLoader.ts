import { EggLoadUnitType, LoadUnitFactory, GlobalGraph, ModuleDescriptorDumper } from '@eggjs/metadata';
import type { GlobalGraphBuildHook, ModuleDescriptor } from '@eggjs/metadata';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { LoaderFactory, ModuleLoader, TEGG_MANIFEST_KEY } from '@eggjs/tegg-loader';
import type { TeggManifestExtension } from '@eggjs/tegg-loader';
import type { ModuleReference } from '@eggjs/tegg-types';
import type { Application } from 'egg';

import { EggAppLoader } from './EggAppLoader.ts';

export class EggModuleLoader {
  app: Application;
  globalGraph: GlobalGraph;
  private pendingBuildHooks: GlobalGraphBuildHook[] = [];
  #moduleDescriptors: readonly ModuleDescriptor[] = [];
  /**
   * True when the app graph was built from a tegg manifest (bundle mode). In
   * that case the module source files do not exist on disk, so module load
   * units must reuse the manifest's precomputed decorated files instead of
   * globbing the file system.
   */
  private loadedFromManifest = false;
  /** Framework module plugins registered by other egg plugins (scan path). */
  readonly #extraModuleReferences: ModuleReference[] = [];

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Register a framework package as a scanned module: its
   * `@InnerObjectProto` / `@XxxLifecycleProto` classes are collected by the
   * regular module scan (loadApp diverts them into innerObjectClazzList) —
   * the module-plugin path, no hand-fed class lists.
   */
  registerModule(modulePath: string): void {
    this.#extraModuleReferences.push({
      name: ModuleConfigUtil.readModuleNameSync(modulePath),
      path: modulePath,
    });
  }

  /** App references plus registered framework modules, deduped by path (first wins). */
  get allModuleReferences(): readonly ModuleReference[] {
    const seen = new Set<string>();
    const res: ModuleReference[] = [];
    for (const ref of [...this.#extraModuleReferences, ...this.app.moduleReferences]) {
      if (seen.has(ref.path)) continue;
      seen.add(ref.path);
      res.push(ref);
    }
    return res;
  }

  registerBuildHook(hook: GlobalGraphBuildHook): void {
    this.pendingBuildHooks.push(hook);
  }

  private async loadApp(): Promise<void> {
    const loader = new EggAppLoader(this.app);
    const loadUnit = await LoadUnitFactory.createLoadUnit(this.app.baseDir, EggLoadUnitType.APP, loader);
    this.app.moduleHandler.loadUnits.push(loadUnit);
  }

  private async buildAppGraph(): Promise<GlobalGraph> {
    for (const plugin of Object.values(this.app.plugins)) {
      if (!plugin.enable) continue;
      const modulePlugin = this.app.moduleReferences.find((t) => t.path === plugin.path);
      if (modulePlugin) {
        modulePlugin.optional = false;
      }
    }

    // Pass manifest data to LoaderFactory if available
    const manifest = this.app.loader.manifest;
    const manifestTegg = manifest.getExtension(TEGG_MANIFEST_KEY) as TeggManifestExtension | undefined;
    const loadAppManifest = manifestTegg?.moduleDescriptors?.length ? manifestTegg : undefined;
    this.loadedFromManifest = !!loadAppManifest;

    // Reuse egg-core's loader fs so discovery goes through the shared VFS:
    // RealLoaderFS in normal mode (zero behavior change), ManifestLoaderFS in bundle mode.
    const loaderFS = this.app.loader.loaderFS;
    const moduleDescriptors = await LoaderFactory.loadApp(this.allModuleReferences, loadAppManifest, loaderFS);
    this.#moduleDescriptors = moduleDescriptors;

    // Collect manifest data when not loaded from manifest
    if (!loadAppManifest) {
      EggModuleLoader.collectTeggManifest(this.app, this.allModuleReferences, moduleDescriptors);
    }

    for (const moduleDescriptor of moduleDescriptors) {
      ModuleDescriptorDumper.dump(moduleDescriptor, {
        dumpDir: this.app.baseDir,
      }).catch((e: Error) => {
        e.message = 'dump module descriptor failed: ' + e.message;
        this.app.logger.warn(e);
      });
    }
    const graph = await GlobalGraph.create(moduleDescriptors);
    return graph;
  }

  /**
   * Build tegg manifest data from module references and descriptors.
   */
  static buildTeggManifestData(
    moduleReferences: readonly ModuleReference[],
    moduleDescriptors: readonly ModuleDescriptor[],
  ): TeggManifestExtension {
    return {
      moduleReferences: moduleReferences.map((ref) => ({
        name: ref.name,
        path: ref.path,
        optional: ref.optional,
        loaderType: ref.loaderType,
      })),
      moduleDescriptors: moduleDescriptors.map((desc) => ({
        name: desc.name,
        unitPath: desc.unitPath,
        optional: desc.optional,
        decoratedFiles: ModuleDescriptorDumper.getDecoratedFiles(desc),
      })),
    };
  }

  /**
   * Collect tegg manifest data and store in manifest extensions.
   */
  static collectTeggManifest(
    app: Application,
    moduleReferences: readonly ModuleReference[],
    moduleDescriptors: readonly ModuleDescriptor[],
  ): void {
    const data = EggModuleLoader.buildTeggManifestData(moduleReferences, moduleDescriptors);
    app.loader.manifest.setExtension(TEGG_MANIFEST_KEY, data);
  }

  private async loadModule(): Promise<void> {
    this.globalGraph.build();
    this.globalGraph.sort();
    const moduleConfigList = this.globalGraph.moduleConfigList;
    const loaderFS = this.app.loader.loaderFS;

    // In bundle mode the module source files are not present on disk, so a
    // globbing loader returns nothing. Reuse the manifest's precomputed
    // decorated files (the same list buildAppGraph loaded the graph from) so
    // load-unit lifecycle hooks such as EggQualifierProtoHook still see the
    // real decorated classes via `ctx.loader.load()`.
    const decoratedFilesMap = new Map<string, string[]>();
    if (this.loadedFromManifest) {
      const manifestTegg = this.app.loader.manifest.getExtension(TEGG_MANIFEST_KEY) as
        | TeggManifestExtension
        | undefined;
      for (const desc of manifestTegg?.moduleDescriptors ?? []) {
        decoratedFilesMap.set(desc.unitPath, desc.decoratedFiles);
      }
    }

    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const precomputedFiles = decoratedFilesMap.get(modulePath);
      const loader = precomputedFiles
        ? new ModuleLoader(modulePath, { precomputedFiles, loaderFS })
        : LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE, loaderFS);
      const loadUnit = await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      this.app.moduleHandler.loadUnits.push(loadUnit);
    }
  }

  get moduleDescriptors(): readonly ModuleDescriptor[] {
    return this.#moduleDescriptors;
  }

  /**
   * Phase 1: scan modules and create the business GlobalGraph (nodes only),
   * then flush buffered build hooks onto it. Kept separate from load() so the
   * InnerObjectLoadUnit can be instantiated in between — its lifecycle protos
   * (including graph build hooks they register) must be live before build().
   */
  async initGraph(): Promise<void> {
    GlobalGraph.instance = this.globalGraph = await this.buildAppGraph();
    for (const hook of this.pendingBuildHooks) {
      this.globalGraph.registerBuildHook(hook);
    }
  }

  /** Phase 2: create the APP load unit, build()/sort() the graph and create module load units. */
  async load(): Promise<void> {
    await this.loadApp();
    await this.loadModule();
  }
}
