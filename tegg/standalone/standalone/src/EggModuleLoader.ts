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
import { buildTeggManifestData, LoaderFactory, ModuleLoader, type TeggManifestExtension } from '@eggjs/tegg-loader';
import { TeggScope } from '@eggjs/tegg-types';

export interface EggModuleLoaderOptions {
  logger: Logger;
  baseDir: string;
  dump?: boolean;
  /**
   * Tegg manifest data (bundle mode). When provided the module scan reuses the
   * precomputed decorated files instead of globbing the file system.
   */
  manifest?: TeggManifestExtension;
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
    const manifest = options.manifest?.moduleDescriptors?.length ? options.manifest : undefined;
    const moduleDescriptors = await LoaderFactory.loadApp(moduleReferences, manifest, options.loaderFS);
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

  /**
   * Build tegg manifest data from module references and descriptors, the
   * standalone counterpart of the egg plugin's manifest collection. A bundler
   * persists this so bundle-mode boot can skip globbing.
   */
  static buildTeggManifestData(
    moduleReferences: readonly ModuleReference[],
    moduleDescriptors: readonly ModuleDescriptor[],
  ): TeggManifestExtension {
    return buildTeggManifestData(moduleReferences, moduleDescriptors);
  }

  async load(): Promise<LoadUnit[]> {
    const loadUnits: LoadUnit[] = [];
    this.globalGraph.build();
    this.globalGraph.sort();
    const moduleConfigList = GlobalGraph.instance!.moduleConfigList;
    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      // Bundle mode: module source files are not on disk — reuse the manifest's
      // precomputed decorated files so the loader skips globbing, and pass the
      // module name so ModuleLoadUnit.createModule skips reading
      // `<unitPath>/package.json` (no fs on the edge/worker runtime).
      const manifestDesc = this.options.manifest?.moduleDescriptors?.find((d) => d.unitPath === modulePath);
      const loader = manifestDesc
        ? new ModuleLoader(modulePath, {
            precomputedFiles: manifestDesc.decoratedFiles,
            loaderFS: this.options.loaderFS,
          })
        : LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE, this.options.loaderFS);
      const unitName = manifestDesc ? moduleConfig.name : undefined;
      loadUnits.push(await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader, unitName));
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
        const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE, options.loaderFS);
        const loadUnit = await LoadUnitFactory.createPreloadLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
        loadUnits.push(loadUnit);
      }
      for (const load of loadUnits) {
        await load.preLoad?.();
      }
    });
  }
}
