import { EggLoadUnitType, LoadUnitFactory, GlobalGraph, ModuleDescriptorDumper } from '@eggjs/metadata';
import type { GlobalGraphBuildHook, ModuleDescriptor } from '@eggjs/metadata';
import { LoaderFactory, TEGG_MANIFEST_KEY } from '@eggjs/tegg-loader';
import type { TeggManifestExtension } from '@eggjs/tegg-loader';
import type { ModuleReference } from '@eggjs/tegg-types';
import type { Application } from 'egg';

import { EggAppLoader } from './EggAppLoader.ts';

export class EggModuleLoader {
  app: Application;
  globalGraph: GlobalGraph;
  private pendingBuildHooks: GlobalGraphBuildHook[] = [];

  constructor(app: Application) {
    this.app = app;
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

    const moduleDescriptors = await LoaderFactory.loadApp(this.app.moduleReferences, loadAppManifest);

    // Collect manifest data when not loaded from manifest
    if (!loadAppManifest) {
      EggModuleLoader.collectTeggManifest(this.app, moduleDescriptors);
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
  static collectTeggManifest(app: Application, moduleDescriptors: readonly ModuleDescriptor[]): void {
    const data = EggModuleLoader.buildTeggManifestData(app.moduleReferences, moduleDescriptors);
    app.loader.manifest.setExtension(TEGG_MANIFEST_KEY, data);
  }

  private async loadModule(): Promise<void> {
    this.globalGraph.build();
    this.globalGraph.sort();
    const moduleConfigList = this.globalGraph.moduleConfigList;
    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      const loadUnit = await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      this.app.moduleHandler.loadUnits.push(loadUnit);
    }
  }

  async load(): Promise<void> {
    GlobalGraph.instance = this.globalGraph = await this.buildAppGraph();
    for (const hook of this.pendingBuildHooks) {
      this.globalGraph.registerBuildHook(hook);
    }
    await this.loadApp();
    await this.loadModule();
  }
}
