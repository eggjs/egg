import { type EggObjectName, type EggPrototypeName, ObjectInitType } from '@eggjs/core-decorator';
import { IdenticalUtil } from '@eggjs/lifecycle';
import { EggLoadUnitType, type EggPrototype, type LoadUnit } from '@eggjs/metadata';
import { MapUtil } from '@eggjs/tegg-common-util';
import {
  type EggObject,
  EggObjectFactory,
  type LoadUnitInstance,
  LoadUnitInstanceFactory,
  type LoadUnitInstanceLifecycleContext,
  LoadUnitInstanceLifecycleUtil,
} from '@eggjs/tegg-runtime';
import type { Id } from '@eggjs/tegg-types';

export class AppLoadUnitInstance implements LoadUnitInstance {
  readonly loadUnit: LoadUnit;
  readonly id: string;
  readonly name: string;
  private protoToCreateMap: Map<EggPrototypeName, EggPrototype> = new Map();
  private eggObjectMap: Map<Id, Map<EggPrototypeName, EggObject>> = new Map();
  private eggObjectPromiseMap: Map<Id, Map<EggPrototypeName, Promise<EggObject>>> = new Map();

  constructor(loadUnit: LoadUnit) {
    this.loadUnit = loadUnit;
    this.name = loadUnit.name;
    const iterator = this.loadUnit.iterateEggPrototype();
    for (const proto of iterator) {
      if (proto.initType === ObjectInitType.SINGLETON) {
        this.protoToCreateMap.set(proto.name, proto);
      }
    }
    this.id = IdenticalUtil.createLoadUnitInstanceId(loadUnit.id);
  }

  iterateProtoToCreate(): IterableIterator<[EggObjectName, EggPrototype]> {
    return this.protoToCreateMap.entries();
  }

  addProtoToCreate(name: string, proto: EggPrototype): void {
    this.protoToCreateMap.set(name, proto);
  }

  deleteProtoToCreate(name: string): void {
    this.protoToCreateMap.delete(name);
  }

  async init(ctx: LoadUnitInstanceLifecycleContext): Promise<void> {
    await LoadUnitInstanceLifecycleUtil.objectPreCreate(ctx, this);
    for (const [name, proto] of this.protoToCreateMap) {
      await this.getOrCreateEggObject(name, proto);
    }
  }

  async destroy(): Promise<void> {
    const objs: EggObject[] = [];
    for (const protoObjMap of this.eggObjectMap.values()) {
      for (const protoObj of protoObjMap.values()) {
        objs.push(protoObj);
      }
    }
    this.eggObjectMap.clear();
    await Promise.all(
      objs.map(async (obj) => {
        await EggObjectFactory.destroyObject(obj);
      }),
    );
  }

  async getOrCreateEggObject(name: EggPrototypeName, proto: EggPrototype): Promise<EggObject> {
    if (!this.loadUnit.containPrototype(proto)) {
      throw new Error('load unit not contain proto');
    }
    const protoObjMap = MapUtil.getOrStore(this.eggObjectMap, proto.id, new Map());
    if (!protoObjMap.has(name)) {
      const protoObjPromiseMap = MapUtil.getOrStore(this.eggObjectPromiseMap, proto.id, new Map());
      if (!protoObjPromiseMap.has(name)) {
        const objPromise = EggObjectFactory.createObject(name, proto);
        protoObjPromiseMap.set(name, objPromise);
        const obj = await objPromise;
        protoObjPromiseMap.delete(name);
        protoObjMap.set(name, obj);
      } else {
        await protoObjPromiseMap.get(name);
      }
    }
    return protoObjMap.get(name)!;
  }

  getEggObject(name: EggPrototypeName, proto: EggPrototype): EggObject {
    const protoObjMap = this.eggObjectMap.get(proto.id);

    if (!protoObjMap || !protoObjMap.has(name)) {
      throw new Error(`EggObject ${String(proto.name)} not found`);
    }
    return protoObjMap.get(name)!;
  }

  static createModuleLoadUnitInstance(ctx: LoadUnitInstanceLifecycleContext): LoadUnitInstance {
    return new AppLoadUnitInstance(ctx.loadUnit);
  }
}

LoadUnitInstanceFactory.registerLoadUnitInstanceClass(
  EggLoadUnitType.APP,
  AppLoadUnitInstance.createModuleLoadUnitInstance,
);
