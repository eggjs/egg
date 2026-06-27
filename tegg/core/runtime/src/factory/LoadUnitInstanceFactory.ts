import { IdenticalUtil } from '@eggjs/lifecycle';
import { ObjectInitType, TeggScope } from '@eggjs/tegg-types';
import type {
  EggLoadUnitTypeLike,
  EggPrototype,
  LoadUnit,
  LoadUnitInstance,
  LoadUnitInstanceLifecycleContext,
} from '@eggjs/tegg-types';

import { LoadUnitInstanceLifecycleUtil } from '../model/LoadUnitInstance.ts';
import { EggContainerFactory } from './EggContainerFactory.ts';

type LoadUnitInstanceCreator = (ctx: LoadUnitInstanceLifecycleContext) => LoadUnitInstance;
interface LoadUnitInstancePair {
  instance: LoadUnitInstance;
  ctx: LoadUnitInstanceLifecycleContext;
}

const LOAD_UNIT_INSTANCE_MAP_SLOT = Symbol('tegg:runtime:loadUnitInstanceMap');

export class LoadUnitInstanceFactory {
  // type -> creator is class/type-keyed and registered at import/boot time with
  // app-agnostic class refs, so it is safe to keep process-global (shared).
  private static creatorMap: Map<EggLoadUnitTypeLike, LoadUnitInstanceCreator> = new Map();

  // The live load-unit instance registry collides across apps (name-based
  // instanceId), so it is per-app, resolved from the active TeggScope bag.
  private static get instanceMap(): Map<string, LoadUnitInstancePair> {
    return TeggScope.resolve(LOAD_UNIT_INSTANCE_MAP_SLOT, () => new Map(), 'LoadUnitInstanceFactory.instanceMap');
  }

  static registerLoadUnitInstanceClass(type: EggLoadUnitTypeLike, creator: LoadUnitInstanceCreator): void {
    this.creatorMap.set(type, creator);
  }

  static async createLoadUnitInstance(loadUnit: LoadUnit): Promise<LoadUnitInstance> {
    const creator = this.creatorMap.get(loadUnit.type);
    if (!creator) {
      throw new Error(`load unit instance type ${loadUnit.type} is not implement`);
    }
    const instanceId = IdenticalUtil.createLoadUnitInstanceId(loadUnit.id);
    if (!this.instanceMap.has(instanceId)) {
      const ctx: LoadUnitInstanceLifecycleContext = {
        loadUnit,
      };
      const instance = creator(ctx);
      this.instanceMap.set(instanceId, { instance, ctx });
      if (instance.init) {
        // Module init method will create egg object
        // When inject objects, will find load unit instance
        // so should add instance to instanceMap first
        await instance.init(ctx);
      }
    }
    return this.instanceMap.get(instanceId)!.instance;
  }

  static getLoadUnitInstance(loadUnit: LoadUnit): LoadUnitInstance | undefined {
    const instanceId = IdenticalUtil.createLoadUnitInstanceId(loadUnit.id);
    return this.instanceMap.get(instanceId)?.instance;
  }

  static async destroyLoadUnitInstance(loadUnitInstance: LoadUnitInstance): Promise<void> {
    const { ctx } = this.instanceMap.get(loadUnitInstance.id)!;
    await LoadUnitInstanceLifecycleUtil.objectPreDestroy(ctx, loadUnitInstance);
    if (loadUnitInstance.destroy) {
      await loadUnitInstance.destroy(ctx);
    }
    this.instanceMap.delete(loadUnitInstance.id);
    LoadUnitInstanceLifecycleUtil.clearObjectLifecycle(loadUnitInstance);
  }

  static getLoadUnitInstanceByProto(proto: EggPrototype): LoadUnitInstance {
    for (const { instance } of this.instanceMap.values()) {
      if (instance.loadUnit.containPrototype(proto)) {
        return instance;
      }
    }
    throw new Error(`not found load unit for proto ${proto.id}`);
  }
}

EggContainerFactory.registerContainerGetMethod(ObjectInitType.SINGLETON, (proto: EggPrototype) => {
  return LoadUnitInstanceFactory.getLoadUnitInstanceByProto(proto);
});
