import { MapUtil } from '@eggjs/tegg-common-util';
import { IdenticalUtil } from '@eggjs/tegg-lifecycle';
import { EggLoadUnitType, ObjectInitType } from '@eggjs/tegg-types';
import type {
  EggObject,
  EggObjectName,
  EggPrototype,
  EggPrototypeName,
  Id,
  LoadUnit,
  LoadUnitInstance,
  LoadUnitInstanceLifecycleContext,
} from '@eggjs/tegg-types';

import { EggObjectFactory } from '../factory/EggObjectFactory.ts';
import { LoadUnitInstanceFactory } from '../factory/LoadUnitInstanceFactory.ts';
import { LoadUnitInstanceLifecycleUtil } from '../model/LoadUnitInstance.ts';

export class ModuleLoadUnitInstance implements LoadUnitInstance {
  readonly loadUnit: LoadUnit;
  readonly id: string;
  readonly name: string;
  private protoToCreateMap: [EggPrototypeName, EggPrototype][] = [];
  private eggObjectMap: Map<Id, Map<EggPrototypeName, EggObject>> = new Map();
  private eggObjectPromiseMap: Map<Id, Map<EggPrototypeName, Promise<EggObject>>> = new Map();

  constructor(loadUnit: LoadUnit) {
    this.loadUnit = loadUnit;
    this.name = loadUnit.name;
    const iterator = this.loadUnit.iterateEggPrototype();
    for (const proto of iterator) {
      if (proto.initType === ObjectInitType.SINGLETON) {
        this.protoToCreateMap.push([proto.name, proto]);
      }
    }
    this.id = IdenticalUtil.createLoadUnitInstanceId(loadUnit.id);
  }

  iterateProtoToCreate(): IterableIterator<[EggObjectName, EggPrototype]> {
    return this.protoToCreateMap[Symbol.iterator]();
  }

  addProtoToCreate(name: string, proto: EggPrototype): void {
    this.protoToCreateMap.push([name, proto]);
  }

  deleteProtoToCreate(name: string): void {
    const index = this.protoToCreateMap.findIndex(([protoName]) => protoName === name);
    if (index !== -1) {
      this.protoToCreateMap.splice(index, 1);
    }
  }

  async init(ctx: LoadUnitInstanceLifecycleContext): Promise<void> {
    await LoadUnitInstanceLifecycleUtil.objectPreCreate(ctx, this);
    for (const [name, proto] of this.protoToCreateMap) {
      await this.getOrCreateEggObject(name, proto);
    }
    await LoadUnitInstanceLifecycleUtil.objectPostCreate(ctx, this);
  }

  async destroy(): Promise<void> {
    const objs: EggObject[] = [];
    for (const protoObjMap of this.eggObjectMap.values()) {
      for (const obj of protoObjMap.values()) {
        objs.push(obj);
      }
    }
    this.eggObjectMap.clear();
    await Promise.all(
      objs.map(async obj => {
        await EggObjectFactory.destroyObject(obj);
      })
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
    return new ModuleLoadUnitInstance(ctx.loadUnit);
  }
}

LoadUnitInstanceFactory.registerLoadUnitInstanceClass(
  EggLoadUnitType.MODULE,
  ModuleLoadUnitInstance.createModuleLoadUnitInstance
);
