import { EggLoadUnitType, LoadUnitFactory, GlobalGraph, ModuleDescriptorDumper } from '@eggjs/metadata';
import type { GlobalGraphBuildHook, ModuleDescriptor } from '@eggjs/metadata';
import { buildTeggManifestData, LoaderFactory, TEGG_MANIFEST_KEY } from '@eggjs/tegg-loader';
import type { ModuleReference, TeggManifest } from '@eggjs/tegg-types';
import type { Application } from 'egg';

import { EggAppLoader } from './EggAppLoader.ts';

export class EggModuleLoader {
  app: Application;
  globalGraph: GlobalGraph;
  private pendingBuildHooks: GlobalGraphBuildHook[] = [];
  #moduleDescriptors: readonly ModuleDescriptor[] = [];

  constructor(app: Application) {
    this.app = app;
  }

  registerBuildHook(hook: GlobalGraphBuildHook): void {
    this.pendingBuildHooks.push(hook);
  }

  static #isModulePluginReference(moduleReference: ModuleReference, plugin: { package?: string; path?: string }) {
    if (moduleReference.package && plugin.package) {
      return moduleReference.package === plugin.package;
    }
    return !!plugin.path && moduleReference.path === plugin.path;
  }

  static reconcileModulePluginReferences(app: Application): void {
    const enabledPlugins = Object.values(app.plugins).filter((plugin) => plugin.enable);
    const allPlugins = Object.values(app.loader.allPlugins ?? {});

    for (const moduleReference of app.moduleReferences) {
      if (enabledPlugins.some((plugin) => EggModuleLoader.#isModulePluginReference(moduleReference, plugin))) {
        moduleReference.optional = false;
        continue;
      }
      if (allPlugins.some((plugin) => EggModuleLoader.#isModulePluginReference(moduleReference, plugin))) {
        moduleReference.optional = true;
      }
    }
  }

  private async loadApp(): Promise<void> {
    const loader = new EggAppLoader(this.app);
    const loadUnit = await LoadUnitFactory.createLoadUnit(this.app.baseDir, EggLoadUnitType.APP, loader);
    this.app.moduleHandler.loadUnits.push(loadUnit);
  }

  private async buildAppGraph(): Promise<GlobalGraph> {
    // Normalize module plugin references against the Egg plugin enable state.
    // Ordinary app modules keep their original optional semantics.
    EggModuleLoader.reconcileModulePluginReferences(this.app);

    const manifest = this.app.loader.manifest;
    const manifestTegg = manifest.getExtension(TEGG_MANIFEST_KEY) as TeggManifest | undefined;
    const moduleDescriptors = await LoaderFactory.loadApp(this.app.moduleReferences, this.app.loader.loaderFS);
    this.#moduleDescriptors = moduleDescriptors;

    // Collect manifest data when not loaded from manifest
    if (!manifestTegg?.moduleDescriptors.length) {
      EggModuleLoader.collectTeggManifest(this.app, this.app.moduleReferences, moduleDescriptors);
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
  ): TeggManifest {
    return buildTeggManifestData(moduleReferences, moduleDescriptors);
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

    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      const loadUnit = await LoadUnitFactory.createLoadUnit(
        modulePath,
        EggLoadUnitType.MODULE,
        loader,
        moduleConfig.name,
      );
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
