import { LoadUnitFactory } from '@eggjs/metadata';
import type {
  CreateObjectMethod,
  EggObject,
  EggObjectLifeCycleContext,
  EggObjectName,
  EggPrototype,
  EggPrototypeClass,
} from '@eggjs/tegg-types';

import { EggObjectImpl } from '../impl/EggObjectImpl.ts';
import { EggObjectLifecycleUtil } from '../model/EggObject.ts';
import { LoadUnitInstanceFactory } from './LoadUnitInstanceFactory.ts';

interface EggObjectPair {
  obj: EggObject;
  ctx: EggObjectLifeCycleContext;
}

export class EggObjectFactory {
  static eggObjectMap: Map<string, EggObjectPair> = new Map();
  static eggObjectCreateMap: Map<EggPrototypeClass, CreateObjectMethod> = new Map();

  public static registerEggObjectCreateMethod(protoClass: EggPrototypeClass, method: CreateObjectMethod): void {
    this.eggObjectCreateMap.set(protoClass, method);
  }

  public static getEggObjectCreateMethod(protoClass: EggPrototypeClass): CreateObjectMethod {
    if (this.eggObjectCreateMap.has(protoClass)) {
      return this.eggObjectCreateMap.get(protoClass)!;
    }
    return EggObjectImpl.createObject;
  }

  static async createObject(name: EggObjectName, proto: EggPrototype): Promise<EggObject> {
    const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
    if (!loadUnit) {
      throw new Error(`not found load unit ${proto.loadUnitId}`);
    }
    const loadUnitInstance = LoadUnitInstanceFactory.getLoadUnitInstance(loadUnit);
    const lifecycleContext: EggObjectLifeCycleContext = {
      loadUnit,
      loadUnitInstance: loadUnitInstance!,
    };
    const method = this.getEggObjectCreateMethod(proto.constructor as EggPrototypeClass);
    const args = [name, proto, lifecycleContext];
    const obj = await Reflect.apply(method, null, args);
    this.eggObjectMap.set(obj.id, { obj, ctx: lifecycleContext });
    return obj;
  }

  static async destroyObject(obj: EggObject): Promise<void> {
    const { ctx } = this.eggObjectMap.get(obj.id)!;
    try {
      if (obj.destroy) {
        await obj.destroy(ctx);
      }
    } finally {
      this.eggObjectMap.delete(obj.id);
      EggObjectLifecycleUtil.clearObjectLifecycle(obj);
    }
  }
}
