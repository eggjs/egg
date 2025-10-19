import {
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  EggPrototypeLifecycleUtil,
  LoadUnitFactory,
  LoadUnitLifecycleUtil,
} from '@eggjs/tegg-metadata';
import {
  AbstractEggContext,
  EggContainerFactory,
  EggObjectFactory,
  LoadUnitInstanceFactory,
  EggContextLifecycleUtil,
  EggObjectLifecycleUtil,
  LoadUnitInstanceLifecycleUtil,
} from '@eggjs/tegg-runtime';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { type EggProtoImplClass, IdenticalUtil, type RuntimeConfig, type QualifierInfo } from '@eggjs/tegg';
import { Application } from 'egg';

export default class TEggPluginApplication extends Application {
  // @eggjs/tegg-metadata should not depend by other egg plugins.
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
    return LoadUnitLifecycleUtil;
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
    return LoadUnitInstanceLifecycleUtil;
  }

  get eggContainerFactory(): typeof EggContainerFactory {
    return EggContainerFactory;
  }

  get loaderFactory(): typeof LoaderFactory {
    return LoaderFactory;
  }

  get eggPrototypeLifecycleUtil(): typeof EggPrototypeLifecycleUtil {
    return EggPrototypeLifecycleUtil;
  }

  get eggContextLifecycleUtil(): typeof EggContextLifecycleUtil {
    return EggContextLifecycleUtil;
  }

  get eggObjectLifecycleUtil(): typeof EggObjectLifecycleUtil {
    return EggObjectLifecycleUtil;
  }

  get abstractEggContext(): typeof AbstractEggContext {
    return AbstractEggContext;
  }

  get identicalUtil(): typeof IdenticalUtil {
    return IdenticalUtil;
  }

  get runtimeConfig(): RuntimeConfig {
    const config = this.config;
    return {
      baseDir: config.baseDir,
      env: config.env,
      name: config.name,
    };
  }

  async getEggObject<T>(
    clazz: EggProtoImplClass<T>,
    name?: string,
    qualifiers?: QualifierInfo | QualifierInfo[]
  ): Promise<T> {
    if (qualifiers) {
      qualifiers = Array.isArray(qualifiers) ? qualifiers : [qualifiers];
    }
    const eggObject = await EggContainerFactory.getOrCreateEggObjectFromClazz(
      clazz as EggProtoImplClass,
      name,
      qualifiers as QualifierInfo[]
    );
    return eggObject.obj as T;
  }

  async getEggObjectFromName<T extends object>(name: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T> {
    if (qualifiers) {
      qualifiers = Array.isArray(qualifiers) ? qualifiers : [qualifiers];
    }
    const eggObject = await EggContainerFactory.getOrCreateEggObjectFromName(name, qualifiers as QualifierInfo[]);
    return eggObject.obj as T;
  }
}
