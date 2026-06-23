import type { EggProtoImplClass, QualifierInfo } from '@eggjs/core-decorator';
import { IdenticalUtil } from '@eggjs/lifecycle';
import {
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  EggPrototypeLifecycleUtil,
  eggPrototypeLifecycleUtilFromBag,
  LoadUnitFactory,
  LoadUnitLifecycleUtil,
  loadUnitLifecycleUtilFromBag,
} from '@eggjs/metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import {
  AbstractEggContext,
  EggContainerFactory,
  EggObjectFactory,
  LoadUnitInstanceFactory,
  EggContextLifecycleUtil,
  eggContextLifecycleUtilFromBag,
  EggObjectLifecycleUtil,
  eggObjectLifecycleUtilFromBag,
  LoadUnitInstanceLifecycleUtil,
  loadUnitInstanceLifecycleUtilFromBag,
} from '@eggjs/tegg-runtime';
import type { RuntimeConfig } from '@eggjs/tegg-types';
import { TeggScope } from '@eggjs/tegg-types';
import type { Application } from 'egg';

export default class TEggPluginApplication {
  // @eggjs/metadata should not depend by other egg plugins.
  // May make multi singleton instances.
  // So tegg-compatible should delegate the metadata factories
  // TODO delegate all the singleton
  get eggPrototypeCreatorFactory(): typeof EggPrototypeCreatorFactory {
    return EggPrototypeCreatorFactory;
  }

  get eggPrototypeFactory(): EggPrototypeFactory {
    return EggPrototypeFactory.instance;
  }

  get loadUnitLifecycleUtil(): typeof LoadUnitLifecycleUtil {
    return loadUnitLifecycleUtilFromBag((this as unknown as Application)._teggScopeBag);
  }

  get loadUnitFactory(): typeof LoadUnitFactory {
    return LoadUnitFactory;
  }

  get eggObjectFactory(): typeof EggObjectFactory {
    return EggObjectFactory;
  }

  get loadUnitInstanceFactory(): typeof LoadUnitInstanceFactory {
    return LoadUnitInstanceFactory;
  }

  get loadUnitInstanceLifecycleUtil(): typeof LoadUnitInstanceLifecycleUtil {
    return loadUnitInstanceLifecycleUtilFromBag((this as unknown as Application)._teggScopeBag);
  }

  get eggContainerFactory(): typeof EggContainerFactory {
    return EggContainerFactory;
  }

  get loaderFactory(): typeof LoaderFactory {
    return LoaderFactory;
  }

  get eggPrototypeLifecycleUtil(): typeof EggPrototypeLifecycleUtil {
    return eggPrototypeLifecycleUtilFromBag((this as unknown as Application)._teggScopeBag);
  }

  get eggContextLifecycleUtil(): typeof EggContextLifecycleUtil {
    return eggContextLifecycleUtilFromBag((this as unknown as Application)._teggScopeBag);
  }

  get eggObjectLifecycleUtil(): typeof EggObjectLifecycleUtil {
    return eggObjectLifecycleUtilFromBag((this as unknown as Application)._teggScopeBag);
  }

  get abstractEggContext(): typeof AbstractEggContext {
    return AbstractEggContext;
  }

  get identicalUtil(): typeof IdenticalUtil {
    return IdenticalUtil;
  }

  get runtimeConfig(): RuntimeConfig {
    const config = (this as unknown as Application).config;
    return {
      baseDir: config.baseDir,
      env: config.env,
      name: config.name,
    };
  }

  async getEggObject<T>(
    clazz: EggProtoImplClass<T>,
    name?: string,
    qualifiers?: QualifierInfo | QualifierInfo[],
  ): Promise<T> {
    if (qualifiers) {
      qualifiers = Array.isArray(qualifiers) ? qualifiers : [qualifiers];
    }
    const bag = (this as unknown as Application)._teggScopeBag;
    const doWork = async (): Promise<T> => {
      const eggObject = await EggContainerFactory.getOrCreateEggObjectFromClazz(
        clazz as EggProtoImplClass,
        name,
        qualifiers as QualifierInfo[],
      );
      return eggObject.obj as T;
    };
    return bag ? TeggScope.run(bag, doWork) : doWork();
  }

  async getEggObjectFromName<T extends object>(name: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T> {
    if (qualifiers) {
      qualifiers = Array.isArray(qualifiers) ? qualifiers : [qualifiers];
    }
    const bag = (this as unknown as Application)._teggScopeBag;
    const doWork = async (): Promise<T> => {
      const eggObject = await EggContainerFactory.getOrCreateEggObjectFromName(name, qualifiers as QualifierInfo[]);
      return eggObject.obj as T;
    };
    return bag ? TeggScope.run(bag, doWork) : doWork();
  }
}
