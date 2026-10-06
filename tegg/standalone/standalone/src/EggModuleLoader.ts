import type { LoaderFS } from '@eggjs/loader-fs';
import {
  EggLoadUnitType,
  GlobalGraph,
  type LoadUnit,
  LoadUnitFactory,
  type ModuleDescriptor,
  ModuleDescriptorDumper,
} from '@eggjs/metadata';
import type { Logger } from '@eggjs/tegg';
import type { ModuleReference } from '@eggjs/tegg-common-util';
import { buildTeggManifestData, createTeggManifestLoaderFS, LoaderFactory } from '@eggjs/tegg-loader';
import { type TeggManifest, TeggScope } from '@eggjs/tegg-types';

export interface EggModuleLoaderOptions {
  logger: Logger;
  baseDir: string;
  dump?: boolean;
  /**
   * Tegg manifest data (bundle mode). Its decorated-file index is exposed
   * through a manifest-backed LoaderFS instead of the runtime filesystem.
   */
  manifest?: TeggManifest;
  /** Virtual fs used together with manifest in bundle mode. */
  loaderFS?: LoaderFS;
}

export class EggModuleLoader {
  private moduleReferences: readonly ModuleReference[];
  private globalGraph: GlobalGraph;
  private options: EggModuleLoaderOptions;
  #moduleDescriptors: readonly ModuleDescriptor[] = [];

  constructor(moduleReferences: readonly ModuleReference[], options: EggModuleLoaderOptions) {
    this.moduleReferences = moduleReferences;
    this.options = options;
  }

  get moduleDescriptors(): readonly ModuleDescriptor[] {
    return this.#moduleDescriptors;
  }

  async init(): Promise<void> {
    const { globalGraph, moduleDescriptors } = await EggModuleLoader.generateAppGraph(
      this.moduleReferences,
      this.options,
    );
    GlobalGraph.instance = this.globalGraph = globalGraph;
    this.#moduleDescriptors = moduleDescriptors;
  }

  private static async generateAppGraph(
    moduleReferences: readonly ModuleReference[],
    options: EggModuleLoaderOptions,
  ): Promise<{ globalGraph: GlobalGraph; moduleDescriptors: readonly ModuleDescriptor[] }> {
    const loaderFS = options.manifest
      ? createTeggManifestLoaderFS(options.baseDir, options.manifest, options.loaderFS)
      : options.loaderFS;
    const moduleDescriptors = await LoaderFactory.loadApp(moduleReferences, loaderFS);
    if (options.dump !== false) {
      for (const moduleDescriptor of moduleDescriptors) {
        ModuleDescriptorDumper.dump(moduleDescriptor, {
          dumpDir: options.baseDir,
        }).catch((e) => {
          e.message = 'dump module descriptor failed: ' + e.message;
          options.logger.warn(e);
        });
      }
    }
    const globalGraph = await GlobalGraph.create(moduleDescriptors);
    return { globalGraph, moduleDescriptors };
  }

  /** Build manifest data that allows a bundled host to skip filesystem scans. */
  static buildTeggManifestData(
    moduleReferences: readonly ModuleReference[],
    moduleDescriptors: readonly ModuleDescriptor[],
  ): TeggManifest {
    return buildTeggManifestData(moduleReferences, moduleDescriptors);
  }

  async load(): Promise<LoadUnit[]> {
    const loadUnits: LoadUnit[] = [];
    this.globalGraph.build();
    this.globalGraph.sort();
    for (const moduleConfig of GlobalGraph.instance!.moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      loadUnits.push(
        await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader, moduleConfig.name),
      );
    }
    return loadUnits;
  }

  static async preLoad(moduleReferences: readonly ModuleReference[], options: EggModuleLoaderOptions): Promise<void> {
    // Isolate preload in its own temporary scope so its graph/proto registrations
    // do not leak into the process-default bag or any concurrent app.
    await TeggScope.run(TeggScope.createBag(), async () => {
      const loadUnits: LoadUnit[] = [];
      const { globalGraph } = await EggModuleLoader.generateAppGraph(moduleReferences, options);
      GlobalGraph.instance = globalGraph;
      globalGraph.sort();
      const moduleConfigList = globalGraph.moduleConfigList;
      for (const moduleConfig of moduleConfigList) {
        const modulePath = moduleConfig.path;
        const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
        const loadUnit = await LoadUnitFactory.createPreloadLoadUnit(
          modulePath,
          EggLoadUnitType.MODULE,
          loader,
          moduleConfig.name,
        );
        loadUnits.push(loadUnit);
      }
      for (const load of loadUnits) {
        await load.preLoad?.();
      }
    });
  }
}
