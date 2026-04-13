import '@eggjs/tegg-config/types';
import type { QualifierInfo } from '@eggjs/core-decorator';
import type { IdenticalUtil } from '@eggjs/lifecycle';
import type {
  EggPrototypeCreatorFactory,
  EggPrototypeFactory,
  EggPrototypeLifecycleUtil,
  LoadUnitFactory,
  LoadUnitLifecycleUtil,
} from '@eggjs/metadata';
import type { LoaderFactory } from '@eggjs/tegg-loader';
import type {
  AbstractEggContext,
  EggContainerFactory,
  EggObjectFactory,
  LoadUnitInstanceFactory,
  EggContextLifecycleUtil,
  EggObjectLifecycleUtil,
  LoadUnitInstanceLifecycleUtil,
  EggContext as TEggContext,
} from '@eggjs/tegg-runtime';

import type { EggContextHandler } from './lib/EggContextHandler.ts';
import type { ModuleHandler } from './lib/ModuleHandler.ts';

declare module 'egg' {
  export interface EggModule {}

  export interface Application {
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
      qualifiers?: QualifierInfo | QualifierInfo[],
    ): Promise<T>;
    getEggObjectFromName<T extends object>(name: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;

    // set on ModuleHandler.init()
    module: EggModule;

    /**
     * Mock the module context, only for unittest
     */
    mockModuleContext(data?: any): Promise<Context>;
    /**
     * Mock the module context scope, only for unittest
     */
    mockModuleContextScope<R = any>(fn: (ctx: Context) => Promise<R>, data?: any): Promise<R>;
    /**
     * Destroy the module context, only for unittest
     */
    destroyModuleContext(context: Context): Promise<void>;
  }

  interface Context {
    beginModuleScope(func: () => Promise<void>): Promise<void>;
    // getEggObject<T>(clazz: EggProtoImplClass<T>, name?: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;
    getEggObject<T>(
      clazz: new (...args: any[]) => T,
      name?: string,
      qualifiers?: QualifierInfo | QualifierInfo[],
    ): Promise<T>;
    getEggObjectFromName<T>(name: string, qualifiers?: QualifierInfo | QualifierInfo[]): Promise<T>;
    teggContext: TEggContext;

    module: EggModule;
  }
}
