import { PrototypeUtil } from '@eggjs/core-decorator';
import type { LoaderFS } from '@eggjs/loader-fs';
import { ModuleDescriptorDumper, type ModuleDescriptor } from '@eggjs/metadata';
import {
  EggLoadUnitType,
  type EggLoadUnitTypeLike,
  type EggProtoImplClass,
  type Loader,
  type ModuleReference,
  type TeggManifest,
} from '@eggjs/tegg-types';

export type LoaderCreator = (unitPath: string, loaderFS?: LoaderFS) => Loader;

export const TEGG_MANIFEST_KEY = 'tegg';

export function buildTeggManifestData(
  moduleReferences: readonly ModuleReference[],
  moduleDescriptors: readonly ModuleDescriptor[],
): TeggManifest {
  return {
    moduleReferences: moduleReferences.map((ref) => ({
      name: ref.name,
      package: ref.package,
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

export class LoaderFactory {
  private static loaderCreatorMap: Map<EggLoadUnitTypeLike, LoaderCreator> = new Map();

  static createLoader(unitPath: string, type: EggLoadUnitTypeLike, loaderFS?: LoaderFS): Loader {
    const creator = this.loaderCreatorMap.get(type);
    if (!creator) {
      throw new Error(`not find creator for loader type ${type}`);
    }
    return creator(unitPath, loaderFS);
  }

  static registerLoader(type: EggLoadUnitTypeLike, creator: LoaderCreator): void {
    this.loaderCreatorMap.set(type, creator);
  }

  static async loadApp(moduleReferences: readonly ModuleReference[], loaderFS?: LoaderFS): Promise<ModuleDescriptor[]> {
    const result: ModuleDescriptor[] = [];
    const multiInstanceClazzList: EggProtoImplClass[] = [];

    for (const moduleReference of moduleReferences) {
      const loaderType = moduleReference.loaderType || EggLoadUnitType.MODULE;
      const loader = LoaderFactory.createLoader(moduleReference.path, loaderType, loaderFS);

      const res: ModuleDescriptor = {
        name: moduleReference.name,
        unitPath: moduleReference.path,
        clazzList: [],
        protos: [],
        multiInstanceClazzList,
        innerObjectClazzList: [],
        optional: moduleReference.optional,
      };
      result.push(res);
      const clazzList = await loader.load();
      for (const clazz of clazzList) {
        // Inner object protos are also egg prototypes, so this branch must come first.
        if (PrototypeUtil.isEggInnerObject(clazz)) {
          res.innerObjectClazzList!.push(clazz);
        } else if (PrototypeUtil.isEggPrototype(clazz)) {
          res.clazzList.push(clazz);
        } else if (PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
          res.multiInstanceClazzList.push(clazz);
        }
      }
    }
    return result;
  }
}
