import {
  EggLoadUnitType,
  GlobalGraph,
  type Loader,
  type LoadUnit,
  LoadUnitFactory,
  ModuleDescriptorDumper,
} from '@eggjs/metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import type { ModuleReference } from '@eggjs/tegg-common-util';
import type { Logger } from '@eggjs/tegg';

export interface EggModuleLoaderOptions {
  logger: Logger;
  baseDir: string;
  dump?: boolean;
}

export class EggModuleLoader {
  private moduleReferences: readonly ModuleReference[];
  private globalGraph: GlobalGraph;
  private options: EggModuleLoaderOptions;

  constructor(moduleReferences: readonly ModuleReference[], options: EggModuleLoaderOptions) {
    this.moduleReferences = moduleReferences;
    this.options = options;
  }

  async init(): Promise<void> {
    GlobalGraph.instance = this.globalGraph = await EggModuleLoader.generateAppGraph(
      this.moduleReferences,
      this.options,
    );
  }

  private static async generateAppGraph(moduleReferences: readonly ModuleReference[], options: EggModuleLoaderOptions) {
    const moduleDescriptors = await LoaderFactory.loadApp(moduleReferences);
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
    return globalGraph;
  }

  async load(): Promise<LoadUnit[]> {
    const loadUnits: LoadUnit[] = [];
    this.globalGraph.build();
    this.globalGraph.sort();
    const moduleConfigList = GlobalGraph.instance!.moduleConfigList;
    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      const loadUnit = await LoadUnitFactory.createLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      loadUnits.push(loadUnit);
    }
    return loadUnits;
  }

  static async preLoad(moduleReferences: readonly ModuleReference[], options: EggModuleLoaderOptions): Promise<void> {
    const loadUnits: LoadUnit[] = [];
    const loaderCache = new Map<string, Loader>();
    const globalGraph = (GlobalGraph.instance = await EggModuleLoader.generateAppGraph(moduleReferences, options));
    globalGraph.sort();
    const moduleConfigList = globalGraph.moduleConfigList;
    for (const moduleConfig of moduleConfigList) {
      const modulePath = moduleConfig.path;
      const loader = loaderCache.get(modulePath)!;
      const loadUnit = await LoadUnitFactory.createPreloadLoadUnit(modulePath, EggLoadUnitType.MODULE, loader);
      loadUnits.push(loadUnit);
    }
    for (const load of loadUnits) {
      await load.preLoad?.();
    }
  }
}
