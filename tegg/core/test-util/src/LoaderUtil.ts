import { type EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import {
  EggLoadUnitType,
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
    GlobalGraph.instance = new GlobalGraph();
    for (const hook of hooks ?? []) {
      GlobalGraph.instance.registerBuildHook(hook);
    }
    const multiInstanceEggProtoClass: {
      clazz: any;
      unitPath: string;
      moduleName: string;
    }[] = [];
    for (let i = 0; i < modulePaths.length; i++) {
      const modulePath = modulePaths[i];
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      const clazzList = await loader.load();
      const moduleName = ModuleConfigUtil.readModuleNameSync(modulePath);
      for (const clazz of clazzList) {
        if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
          multiInstanceEggProtoClass.push({
            clazz,
            unitPath: modulePath,
            moduleName,
          });
        }
      }
    }
    for (let i = 0; i < modulePaths.length; i++) {
      const modulePath = modulePaths[i];
      const loader = LoaderFactory.createLoader(modulePath, EggLoadUnitType.MODULE);
      const clazzList = await loader.load();
      const eggProtoClass: EggProtoImplClass[] = [];
      for (const clazz of clazzList) {
        if (PrototypeUtil.isEggPrototype(clazz)) {
          eggProtoClass.push(clazz);
        }
      }
      GlobalGraph.instance.addModuleNode(
        LoaderUtil.buildModuleNode(modulePath, eggProtoClass, multiInstanceEggProtoClass),
      );
    }
    GlobalGraph.instance.build();
    GlobalGraph.instance.sort();
  }
}
