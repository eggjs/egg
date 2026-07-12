import { type EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import {
  GlobalGraph,
  type GlobalGraphBuildHook,
  GlobalModuleNodeBuilder,
  LoadUnitFactory,
  type GlobalModuleNode,
  type ModuleDescriptor,
} from '@eggjs/metadata';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { LoaderFactory } from '@eggjs/tegg-loader';
import {
  INNER_OBJECT_LOAD_UNIT_NAME,
  InnerObjectLoadUnitBuilder,
  type LoadUnitInstance,
  LoadUnitInstanceFactory,
} from '@eggjs/tegg-runtime';

export interface BuiltGlobalGraph {
  moduleDescriptors: ModuleDescriptor[];
  innerObjectLoadUnitInstance: LoadUnitInstance;
}

export class LoaderUtil {
  static async loadFile(filePath: string): Promise<EggProtoImplClass | null> {
    let clazz;
    try {
      clazz = await import(filePath);
    } catch {
      return null;
    }
    clazz = clazz.__esModule && 'default' in clazz ? clazz.default : clazz;
    if (!PrototypeUtil.isEggPrototype(clazz)) {
      return null;
    }
    PrototypeUtil.setFilePath(clazz, filePath);
    return clazz;
  }

  static buildModuleNode(
    modulePath: string,
    clazzList: EggProtoImplClass[],
    multiInstanceClazzList: {
      clazz: any;
      unitPath: string;
      moduleName: string;
    }[],
    optional = false,
  ): GlobalModuleNode {
    const builder = GlobalModuleNodeBuilder.create(modulePath, optional);
    for (const clazz of clazzList) {
      builder.addClazz(clazz);
    }
    for (const { clazz, unitPath, moduleName } of multiInstanceClazzList) {
      builder.addMultiInstanceClazz(clazz, moduleName, unitPath);
    }
    return builder.build();
  }

  static async buildGlobalGraph(modulePaths: string[], hooks?: GlobalGraphBuildHook[]): Promise<BuiltGlobalGraph> {
    if (LoadUnitFactory.getLoadUnitById(INNER_OBJECT_LOAD_UNIT_NAME)) {
      throw new Error('inner object load unit already exists; LoaderUtil.buildGlobalGraph requires an empty host');
    }
    // Reuse the production classification (LoaderFactory.loadApp): inner
    // object protos are diverted out of module clazzLists there, exactly as
    // in a real boot — no test-local re-implementation.
    const moduleDescriptors = await LoaderUtil.loadModuleDescriptors(modulePaths);
    const globalGraph = await GlobalGraph.create(moduleDescriptors);
    for (const hook of hooks ?? []) {
      globalGraph.registerBuildHook(hook);
    }
    GlobalGraph.instance = globalGraph;

    const builder = new InnerObjectLoadUnitBuilder();
    for (const descriptor of moduleDescriptors) {
      builder.addInnerObjectClazzList(descriptor.innerObjectClazzList ?? [], {
        name: descriptor.name,
        path: descriptor.unitPath,
      });
    }
    const innerObjectLoadUnit = await builder.createLoadUnit({ innerObjects: {} });

    const innerObjectLoadUnitInstance = await LoadUnitInstanceFactory.createLoadUnitInstance(innerObjectLoadUnit);
    globalGraph.build();
    globalGraph.sort();
    return {
      moduleDescriptors,
      innerObjectLoadUnitInstance,
    };
  }

  static async loadModuleDescriptors(modulePaths: string[]): Promise<ModuleDescriptor[]> {
    const moduleReferences = modulePaths.map((modulePath) => ({
      path: modulePath,
      name: ModuleConfigUtil.readModuleNameSync(modulePath),
    }));
    return await LoaderFactory.loadApp(moduleReferences);
  }
}
