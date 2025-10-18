import { AsyncLocalStorage } from 'node:async_hooks';

import {
  ContextHandler,
  EggContainerFactory,
  type EggContext,
  type LoadUnitInstance,
  LoadUnitInstanceFactory,
} from '@eggjs/tegg-runtime';
import {
  EggLoadUnitType,
  type EggPrototype,
  GlobalGraph,
  type GlobalGraphBuildHook,
  LoadUnitFactory,
} from '@eggjs/tegg-metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { type EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';

import { LoaderUtil } from './LoaderUtil.ts';

export class EggContextStorage {
  static storage = new AsyncLocalStorage<EggContext>();

  static register() {
    ContextHandler.getContextCallback = () => {
      return EggContextStorage.storage.getStore();
    };
    ContextHandler.runInContextCallback = (context, fn) => {
      return EggContextStorage.storage.run(context, fn);
    };
  }
}

export class CoreTestHelper {
  static contextStorage = new AsyncLocalStorage();

  static async getLoadUnitInstance(moduleDir: string): Promise<LoadUnitInstance> {
    const loader = LoaderFactory.createLoader(moduleDir, EggLoadUnitType.MODULE);
    const loadUnit = await LoadUnitFactory.createLoadUnit(moduleDir, EggLoadUnitType.MODULE, loader);
    return await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
  }
  static async prepareModules(moduleDirs: string[], hooks?: GlobalGraphBuildHook[]): Promise<Array<LoadUnitInstance>> {
    await LoaderUtil.buildGlobalGraph(moduleDirs, hooks);
    EggContextStorage.register();
    const instances: Array<LoadUnitInstance> = [];
    for (const { path } of GlobalGraph.instance!.moduleConfigList) {
      instances.push(await CoreTestHelper.getLoadUnitInstance(path));
    }
    return instances;
  }
  static async getObject<T>(clazz: EggProtoImplClass<T>): Promise<T> {
    const proto = PrototypeUtil.getClazzProto(clazz as any) as EggPrototype;
    const eggObj = await EggContainerFactory.getOrCreateEggObject(proto, proto.name);
    return eggObj.obj as unknown as T;
  }
}
