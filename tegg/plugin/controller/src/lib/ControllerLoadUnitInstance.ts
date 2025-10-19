import type { EggPrototype, LoadUnit } from '@eggjs/tegg-metadata';
import { type EggObjectName, type EggPrototypeName, IdenticalUtil } from '@eggjs/tegg';
import {
  type EggObject,
  type LoadUnitInstance,
  type LoadUnitInstanceLifecycleContext,
  LoadUnitInstanceLifecycleUtil,
} from '@eggjs/tegg-runtime';

export class ControllerLoadUnitInstance implements LoadUnitInstance {
  readonly loadUnit: LoadUnit;
  readonly id: string;
  readonly name: string;
  private protoToCreateMap: Map<EggPrototypeName, EggPrototype> = new Map();
  private loadUnitInstanceLifecycleUtil: typeof LoadUnitInstanceLifecycleUtil;

  constructor(loadUnit: LoadUnit, loadUnitInstanceLifecycleUtil: typeof LoadUnitInstanceLifecycleUtil) {
    this.loadUnit = loadUnit;
    this.name = loadUnit.name;
    this.id = IdenticalUtil.createLoadUnitInstanceId(loadUnit.id);
    this.loadUnitInstanceLifecycleUtil = loadUnitInstanceLifecycleUtil;
  }

  iterateProtoToCreate(): IterableIterator<[EggObjectName, EggPrototype]> {
    return this.protoToCreateMap.entries();
  }

  addProtoToCreate(): void {
    throw new Error('controller load unit not allow have singleton proto');
  }

  deleteProtoToCreate(): void {
    throw new Error('controller load unit not allow have singleton proto');
  }

  async init(ctx: LoadUnitInstanceLifecycleContext): Promise<void> {
    await this.loadUnitInstanceLifecycleUtil.objectPreCreate(ctx, this);
    await this.loadUnitInstanceLifecycleUtil.objectPostCreate(ctx, this);
  }

  async getOrCreateEggObject(): Promise<EggObject> {
    throw new Error('controller load unit not allow have singleton proto');
  }

  getEggObject(): EggObject {
    throw new Error('controller load unit not allow have singleton proto');
  }
}
