import {
  EggLoadUnitType,
  type EggLoadUnitTypeLike,
  type EggProtoImplClass,
  type Loader,
  type ModuleReference,
} from '@eggjs/tegg-types';
import type { ModuleDescriptor } from '@eggjs/metadata';
import { PrototypeUtil } from '@eggjs/core-decorator';

export type LoaderCreator = (unitPath: string) => Loader;

export class LoaderFactory {
  private static loaderCreatorMap: Map<EggLoadUnitTypeLike, LoaderCreator> = new Map();

  static createLoader(unitPath: string, type: EggLoadUnitTypeLike): Loader {
    const creator = this.loaderCreatorMap.get(type);
    if (!creator) {
      throw new Error(`not find creator for loader type ${type}`);
    }
    return creator(unitPath);
  }

  static registerLoader(type: EggLoadUnitTypeLike, creator: LoaderCreator): void {
    this.loaderCreatorMap.set(type, creator);
  }

  static async loadApp(moduleReferences: readonly ModuleReference[]): Promise<ModuleDescriptor[]> {
    const result: ModuleDescriptor[] = [];
    const multiInstanceClazzList: EggProtoImplClass[] = [];
    for (const moduleReference of moduleReferences) {
      const loader = LoaderFactory.createLoader(
        moduleReference.path,
        moduleReference.loaderType || EggLoadUnitType.MODULE,
      );
      const res: ModuleDescriptor = {
        name: moduleReference.name,
        unitPath: moduleReference.path,
        clazzList: [],
        protos: [],
        multiInstanceClazzList,
        optional: moduleReference.optional,
      };
      result.push(res);
      const clazzList = await loader.load();
      for (const clazz of clazzList) {
        if (PrototypeUtil.isEggPrototype(clazz)) {
          res.clazzList.push(clazz);
        } else if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
          res.multiInstanceClazzList.push(clazz);
        }
      }
    }
    return result;
  }
}
