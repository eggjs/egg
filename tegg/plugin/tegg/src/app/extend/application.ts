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
  type EggContext as TEggContext,
} from '@eggjs/tegg-runtime';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { type EggProtoImplClass, IdenticalUtil, type RuntimeConfig, type QualifierInfo } from '@eggjs/tegg';
import { Application } from 'egg';

import { ModuleHandler } from '../../lib/ModuleHandler.ts';
import { EggContextHandler } from '../../lib/EggContextHandler.ts';

export default class TEggPluginApplication extends Application {
  // @eggjs/tegg-metadata should not depend by other egg plugins.
  // May make multi singleton instances.
  // So tegg-compatible should delegate the metadata factories
  // TODO delegate all the singleton
  get eggPrototypeCreatorFactory() {
    return EggPrototypeCreatorFactory;
  }

  get eggPrototypeFactory() {
    return EggPrototypeFactory.instance;
  }

  get loadUnitLifecycleUtil() {
    return LoadUnitLifecycleUtil;
  }

  get loadUnitFactory() {
    return LoadUnitFactory;
  }

  get eggObjectFactory() {
    return EggObjectFactory;
  }

  get loadUnitInstanceFactory() {
    return LoadUnitInstanceFactory;
  }

  get loadUnitInstanceLifecycleUtil() {
    return LoadUnitInstanceLifecycleUtil;
  }

  get eggContainerFactory() {
    return EggContainerFactory;
  }

  get loaderFactory() {
    return LoaderFactory;
  }

  get eggPrototypeLifecycleUtil() {
    return EggPrototypeLifecycleUtil;
  }

  get eggContextLifecycleUtil() {
    return EggContextLifecycleUtil;
  }

  get eggObjectLifecycleUtil() {
    return EggObjectLifecycleUtil;
  }

  get abstractEggContext() {
    return AbstractEggContext;
  }

  get identicalUtil() {
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

  async getEggObject<T>(clazz: EggProtoImplClass<T>, name?: string, qualifiers?: QualifierInfo | QualifierInfo[]) {
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

  async getEggObjectFromName<T extends object>(name: string, qualifiers?: QualifierInfo | QualifierInfo[]) {
    if (qualifiers) {
      qualifiers = Array.isArray(qualifiers) ? qualifiers : [qualifiers];
    }
    const eggObject = await EggContainerFactory.getOrCreateEggObjectFromName(name, qualifiers as QualifierInfo[]);
    return eggObject.obj as T;
  }
}

declare module 'egg' {
  interface Application {
    eggPrototypeCreatorFactory: typeof EggPrototypeCreatorFactory;
    eggPrototypeFactory: EggPrototypeFactory;
    eggContainerFactory: typeof EggContainerFactory;
    loadUnitFactory: typeof LoadUnitFactory;
    eggObjectFactory: typeof EggObjectFactory;
    loadUnitInstanceFactory: typeof LoadUnitInstanceFactory;
    abstractEggContext: typeof AbstractEggContext;
    identicalUtil: typeof IdenticalUtil;
    loaderFactory: typeof LoaderFactory;

    loadUnitLifecycleUtil: typeof LoadUnitLifecycleUtil;
    loadUnitInstanceLifecycleUtil: typeof LoadUnitInstanceLifecycleUtil;
    eggPrototypeLifecycleUtil: typeof EggPrototypeLifecycleUtil;
    eggContextLifecycleUtil: typeof EggContextLifecycleUtil;
    eggObjectLifecycleUtil: typeof EggObjectLifecycleUtil;

    // TODO: how to define teggContext?
    teggContext: TEggContext;
    moduleHandler: ModuleHandler;
    eggContextHandler: EggContextHandler;

    // getEggObject<T>(clazz: EggProtoImplClass<T>, name?: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;
    getEggObject<T>(
      clazz: new (...args: any[]) => T,
      name?: string,
      qualifiers?: QualifierInfo | QualifierInfo[]
    ): Promise<T>;
    getEggObjectFromName<T extends object>(name: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;

    // set on ModuleHandler.init()
    module: EggModule;
  }
}
