import { PrototypeUtil } from '@eggjs/core-decorator';
import { type LoaderFS } from '@eggjs/loader-fs';
import type { ModuleDescriptor } from '@eggjs/metadata';
import {
  EggLoadUnitType,
  type EggLoadUnitTypeLike,
  type EggProtoImplClass,
  type Loader,
  type ModuleReference,
} from '@eggjs/tegg-types';

export interface LoaderOptions {
  loaderFS?: LoaderFS;
}

export type LoaderCreator = (unitPath: string, options?: LoaderOptions) => Loader;

export interface ManifestModuleReference {
  name: string;
  path: string;
  optional?: boolean;
  loaderType?: string;
}

export interface ManifestModuleDescriptor {
  name: string;
  unitPath: string;
  optional?: boolean;
  /** Files containing decorated classes, relative to unitPath */
  decoratedFiles: string[];
}

/** Shape of the 'tegg' manifest extension stored via ManifestStore.setExtension() */
export interface TeggManifestExtension {
  moduleReferences: ManifestModuleReference[];
  moduleDescriptors: ManifestModuleDescriptor[];
}

export const TEGG_MANIFEST_KEY = 'tegg';

export interface LoadAppManifest {
  moduleDescriptors: ManifestModuleDescriptor[];
}

export class LoaderFactory {
  private static loaderCreatorMap: Map<EggLoadUnitTypeLike, LoaderCreator> = new Map();

  static createLoader(unitPath: string, type: EggLoadUnitTypeLike, options?: LoaderOptions): Loader {
    const creator = this.loaderCreatorMap.get(type);
    if (!creator) {
      throw new Error(`not find creator for loader type ${type}`);
    }
    return creator(unitPath, options);
  }

  static registerLoader(type: EggLoadUnitTypeLike, creator: LoaderCreator): void {
    this.loaderCreatorMap.set(type, creator);
  }

  static async loadApp(
    moduleReferences: readonly ModuleReference[],
    manifest?: LoadAppManifest,
    options?: LoaderOptions,
  ): Promise<ModuleDescriptor[]> {
    const result: ModuleDescriptor[] = [];
    const multiInstanceClazzList: EggProtoImplClass[] = [];

    const manifestMap = new Map<string, ManifestModuleDescriptor>();
    if (manifest?.moduleDescriptors) {
      for (const desc of manifest.moduleDescriptors) {
        manifestMap.set(desc.unitPath, desc);
      }
    }

    // Lazy-load ModuleLoader to avoid circular dependency
    // (ModuleLoader.ts calls LoaderFactory.registerLoader at module scope)
    let ModuleLoaderClass: (typeof import('./impl/ModuleLoader.ts'))['ModuleLoader'] | undefined;
    if (manifestMap.size > 0) {
      ModuleLoaderClass = (await import('./impl/ModuleLoader.ts')).ModuleLoader;
    }

    for (const moduleReference of moduleReferences) {
      const manifestDesc = manifestMap.get(moduleReference.path);
      const loaderType = moduleReference.loaderType || EggLoadUnitType.MODULE;

      let loader: Loader;
      if (manifestDesc && ModuleLoaderClass && loaderType === EggLoadUnitType.MODULE) {
        loader = new ModuleLoaderClass(moduleReference.path, manifestDesc.decoratedFiles, options?.loaderFS);
      } else {
        loader = LoaderFactory.createLoader(moduleReference.path, loaderType, options);
      }

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
