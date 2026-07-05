import { type EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import {
  GlobalGraph,
  type GlobalGraphBuildHook,
  GlobalModuleNodeBuilder,
  type GlobalModuleNode,
} from '@eggjs/metadata';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { LoaderFactory } from '@eggjs/tegg-loader';

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

  static async buildGlobalGraph(modulePaths: string[], hooks?: GlobalGraphBuildHook[]): Promise<void> {
    // Reuse the production classification (LoaderFactory.loadApp): inner
    // object protos are diverted out of module clazzLists there, exactly as
    // in a real boot — no test-local re-implementation.
    const moduleReferences = modulePaths.map((modulePath) => ({
      path: modulePath,
      name: ModuleConfigUtil.readModuleNameSync(modulePath),
    }));
    const moduleDescriptors = await LoaderFactory.loadApp(moduleReferences);
    const globalGraph = await GlobalGraph.create(moduleDescriptors);
    for (const hook of hooks ?? []) {
      globalGraph.registerBuildHook(hook);
    }
    GlobalGraph.instance = globalGraph;
    globalGraph.build();
    globalGraph.sort();
  }
}
