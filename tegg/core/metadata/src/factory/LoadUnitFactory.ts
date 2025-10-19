import type {
  EggLoadUnitTypeLike,
  Id,
  LoadUnit,
  LoadUnitLifecycleContext,
  Loader,
  LoadUnitCreator,
  LoadUnitPair,
} from '@eggjs/tegg-types';

import { LoadUnitLifecycleUtil } from '../model/index.ts';

export class LoadUnitFactory {
  private static loadUnitCreatorMap: Map<EggLoadUnitTypeLike, LoadUnitCreator> = new Map();
  private static loadUnitMap: Map<string, LoadUnitPair> = new Map();
  private static loadUnitIdMap: Map<Id, LoadUnit> = new Map();

  protected static async getLoanUnit(ctx: LoadUnitLifecycleContext, type: EggLoadUnitTypeLike): Promise<LoadUnit> {
    const creator = LoadUnitFactory.loadUnitCreatorMap.get(type);
    if (!creator) {
      throw new Error(`not find creator for load unit type ${type}`);
    }
    return await creator(ctx);
  }

  static async createLoadUnit(unitPath: string, type: EggLoadUnitTypeLike, loader: Loader): Promise<LoadUnit> {
    if (LoadUnitFactory.loadUnitMap.has(unitPath)) {
      return LoadUnitFactory.loadUnitMap.get(unitPath)!.loadUnit;
    }
    const ctx: LoadUnitLifecycleContext = {
      unitPath,
      loader,
    };
    const loadUnit = await LoadUnitFactory.getLoanUnit(ctx, type);
    await LoadUnitLifecycleUtil.objectPreCreate(ctx, loadUnit);
    if (loadUnit.init) {
      await loadUnit.init(ctx);
    }
    await LoadUnitLifecycleUtil.objectPostCreate(ctx, loadUnit);
    LoadUnitFactory.loadUnitMap.set(unitPath, { loadUnit, ctx });
    LoadUnitFactory.loadUnitIdMap.set(loadUnit.id, loadUnit);
    return loadUnit;
  }

  static async createPreloadLoadUnit(unitPath: string, type: EggLoadUnitTypeLike, loader: Loader): Promise<LoadUnit> {
    const ctx: LoadUnitLifecycleContext = {
      unitPath,
      loader,
    };
    return await LoadUnitFactory.getLoanUnit(ctx, type);
  }

  static async destroyLoadUnit(loadUnit: LoadUnit): Promise<void> {
    const { ctx } = LoadUnitFactory.loadUnitMap.get(loadUnit.unitPath)!;
    try {
      await LoadUnitLifecycleUtil.objectPreDestroy(ctx, loadUnit);
      if (loadUnit.destroy) {
        await loadUnit.destroy(ctx);
      }
    } finally {
      LoadUnitFactory.loadUnitMap.delete(loadUnit.unitPath);
      LoadUnitFactory.loadUnitIdMap.delete(loadUnit.id);
      LoadUnitLifecycleUtil.clearObjectLifecycle(loadUnit);
    }
  }

  static getLoadUnitById(id: Id): LoadUnit | undefined {
    return LoadUnitFactory.loadUnitIdMap.get(id);
  }

  static registerLoadUnitCreator(type: EggLoadUnitTypeLike, creator: LoadUnitCreator): void {
    LoadUnitFactory.loadUnitCreatorMap.set(type, creator);
  }
}
