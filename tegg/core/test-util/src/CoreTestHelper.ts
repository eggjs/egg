import { AsyncLocalStorage } from 'node:async_hooks';

import { type EggProtoImplClass, PrototypeUtil } from '@eggjs/core-decorator';
import {
  EggLoadUnitType,
  type EggPrototype,
  GlobalGraph,
  type GlobalGraphBuildHook,
  LoadUnitFactory,
} from '@eggjs/metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import {
  ContextHandler,
  EggContainerFactory,
  INNER_OBJECT_LOAD_UNIT_TYPE,
  type EggContext,
  type LoadUnitInstance,
  LoadUnitInstanceFactory,
} from '@eggjs/tegg-runtime';

import { LoaderUtil } from './LoaderUtil.ts';

export class EggContextStorage {
  static storage: AsyncLocalStorage<EggContext> = new AsyncLocalStorage();

  static register(): void {
    ContextHandler.getContextCallback = () => {
      return EggContextStorage.storage.getStore();
    };
    ContextHandler.runInContextCallback = (context, fn) => {
      return EggContextStorage.storage.run(context, fn);
    };
  }
}

export class CoreTestHelper {
  static contextStorage: AsyncLocalStorage<EggContext> = new AsyncLocalStorage();

  static async getLoadUnitInstance(moduleDir: string): Promise<LoadUnitInstance> {
    const loader = LoaderFactory.createLoader(moduleDir, EggLoadUnitType.MODULE);
    const loadUnit = await LoadUnitFactory.createLoadUnit(moduleDir, EggLoadUnitType.MODULE, loader);
    return await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
  }
  static async prepareModules(moduleDirs: string[], hooks?: GlobalGraphBuildHook[]): Promise<Array<LoadUnitInstance>> {
    EggContextStorage.register();
    const instances: Array<LoadUnitInstance> = [];
    const { innerObjectLoadUnitInstance: innerInstance } = await LoaderUtil.buildGlobalGraph(moduleDirs, hooks);
    for (const { path } of GlobalGraph.instance!.moduleConfigList) {
      const loader = LoaderFactory.createLoader(path, EggLoadUnitType.MODULE);
      const loadUnit = await LoadUnitFactory.createLoadUnit(path, EggLoadUnitType.MODULE, loader);
      instances.push(await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit));
    }
    instances.push(innerInstance);
    return instances;
  }

  static async destroyModules(instances: LoadUnitInstance[]): Promise<void> {
    const innerInstance = instances.find((instance) => instance.loadUnit.type === INNER_OBJECT_LOAD_UNIT_TYPE);
    const businessInstances = instances.filter((instance) => instance !== innerInstance);
    instances.length = 0;

    for (const instance of businessInstances.reverse()) {
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
    }
    for (const instance of businessInstances) {
      await LoadUnitFactory.destroyLoadUnit(instance.loadUnit);
    }
    if (innerInstance) {
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(innerInstance);
      await LoadUnitFactory.destroyLoadUnit(innerInstance.loadUnit);
    }
  }
  static async getObject<T>(clazz: EggProtoImplClass<T>): Promise<T> {
    const proto = PrototypeUtil.getClazzProto(clazz as any) as EggPrototype;
    const eggObj = await EggContainerFactory.getOrCreateEggObject(proto, proto.name);
    return eggObj.obj as unknown as T;
  }
}
