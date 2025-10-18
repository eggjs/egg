import { type EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import is from 'is-type-of';
import { type Loader } from '@eggjs/tegg-types';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';

import { GlobalModuleNodeBuilder, GlobalGraph } from '../../src/index.ts';

export class LoaderUtil {
  static async loadFile(filePath: string): Promise<EggProtoImplClass[]> {
    let exports;
    try {
      exports = await import(filePath);
    } catch (e: any) {
      e.message = '[tegg/loader] load ' + filePath + ' failed: ' + e.message;
      throw e;
    }
    const clazzList: EggProtoImplClass[] = [];
    const exportNames = Object.keys(exports);
    for (const exportName of exportNames) {
      const clazz = exports[exportName];
      const isEggProto =
        is.class(clazz) && (PrototypeUtil.isEggPrototype(clazz) || PrototypeUtil.isEggMultiInstancePrototype(clazz));
      if (!isEggProto) {
        continue;
      }
      PrototypeUtil.setFilePath(clazz, filePath);
      clazzList.push(clazz);
    }
    return clazzList;
  }
}

export function buildModuleNode(
  modulePath: string,
  clazzList: EggProtoImplClass[],
  multiInstanceClazzList: {
    clazz: any;
    unitPath: string;
    moduleName: string;
  }[],
  optional = false
) {
  const builder = GlobalModuleNodeBuilder.create(modulePath, optional);
  for (const clazz of clazzList) {
    builder.addClazz(clazz);
  }
  for (const { clazz, moduleName, unitPath } of multiInstanceClazzList) {
    builder.addMultiInstanceClazz(clazz, moduleName, unitPath);
  }
  return builder.build();
}

export async function buildGlobalGraph(modulePaths: string[], loaders: Loader[]) {
  GlobalGraph.instance = new GlobalGraph();
  const multiInstanceEggProtoClass: {
    clazz: any;
    unitPath: string;
    moduleName: string;
  }[] = [];
  for (let i = 0; i < modulePaths.length; i++) {
    const modulePath = modulePaths[i];
    const loader = loaders[i];
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
    const loader = loaders[i];
    const clazzList = await loader.load();
    const eggProtoClass: EggProtoImplClass[] = [];
    for (const clazz of clazzList) {
      if (PrototypeUtil.isEggPrototype(clazz)) {
        eggProtoClass.push(clazz);
      }
    }
    GlobalGraph.instance.addModuleNode(buildModuleNode(modulePath, eggProtoClass, multiInstanceEggProtoClass));
  }
  GlobalGraph.instance.build();
  GlobalGraph.instance.sort();
}
