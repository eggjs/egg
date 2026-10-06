import { TeggScope } from '@eggjs/tegg-types';
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

const LOAD_UNIT_MAP_SLOT = Symbol('tegg:metadata:loadUnitMap');
const LOAD_UNIT_ID_MAP_SLOT = Symbol('tegg:metadata:loadUnitIdMap');
const LOAD_UNIT_CREATOR_OVERLAY_SLOT = Symbol('tegg:metadata:loadUnitCreatorOverlay');

/**
 * Creators registered at IMPORT time are app-agnostic (MODULE/APP) and live in
 * this process-global base map. Creators registered at BOOT time that capture
 * per-app state (CONTROLLER/Standalone) go into the active app's overlay so
 * concurrent apps never clobber each other. Lookup checks overlay first, then base.
 */
const loadUnitCreatorBaseMap: Map<EggLoadUnitTypeLike, LoadUnitCreator> = new Map();

export class LoadUnitFactory {
  // Per-app caches: collide across apps if shared (unitPath / name-based id),
  // so resolved from the active TeggScope bag (or process-default in single-app).
  private static get loadUnitMap(): Map<string, LoadUnitPair> {
    return TeggScope.resolve(LOAD_UNIT_MAP_SLOT, () => new Map(), 'LoadUnitFactory.loadUnitMap');
  }

  private static get loadUnitIdMap(): Map<Id, LoadUnit> {
    return TeggScope.resolve(LOAD_UNIT_ID_MAP_SLOT, () => new Map(), 'LoadUnitFactory.loadUnitIdMap');
  }

  protected static async getLoanUnit(ctx: LoadUnitLifecycleContext, type: EggLoadUnitTypeLike): Promise<LoadUnit> {
    const overlay = TeggScope.current()?.get(LOAD_UNIT_CREATOR_OVERLAY_SLOT) as
      | Map<EggLoadUnitTypeLike, LoadUnitCreator>
      | undefined;
    const creator = overlay?.get(type) ?? loadUnitCreatorBaseMap.get(type);
    if (!creator) {
      throw new Error(`not find creator for load unit type ${type}`);
    }
    return await creator(ctx);
  }

  static async createLoadUnit(
    unitPath: string,
    type: EggLoadUnitTypeLike,
    loader: Loader,
    unitName?: string,
  ): Promise<LoadUnit> {
    const loadUnitMap = LoadUnitFactory.loadUnitMap;
    if (loadUnitMap.has(unitPath)) {
      return loadUnitMap.get(unitPath)!.loadUnit;
    }
    const ctx: LoadUnitLifecycleContext = {
      unitPath,
      unitName,
      loader,
    };
    const loadUnit = await LoadUnitFactory.getLoanUnit(ctx, type);
    await LoadUnitLifecycleUtil.objectPreCreate(ctx, loadUnit);
    if (loadUnit.init) {
      await loadUnit.init(ctx);
    }
    await LoadUnitLifecycleUtil.objectPostCreate(ctx, loadUnit);
    loadUnitMap.set(unitPath, { loadUnit, ctx });
    LoadUnitFactory.loadUnitIdMap.set(loadUnit.id, loadUnit);
    return loadUnit;
  }

  static async createPreloadLoadUnit(
    unitPath: string,
    type: EggLoadUnitTypeLike,
    loader: Loader,
    unitName?: string,
  ): Promise<LoadUnit> {
    const ctx: LoadUnitLifecycleContext = {
      unitPath,
      unitName,
      loader,
    };
    return await LoadUnitFactory.getLoanUnit(ctx, type);
  }

  static async destroyLoadUnit(loadUnit: LoadUnit): Promise<void> {
    const loadUnitMap = LoadUnitFactory.loadUnitMap;
    const { ctx } = loadUnitMap.get(loadUnit.unitPath)!;
    try {
      await LoadUnitLifecycleUtil.objectPreDestroy(ctx, loadUnit);
      if (loadUnit.destroy) {
        await loadUnit.destroy(ctx);
      }
    } finally {
      loadUnitMap.delete(loadUnit.unitPath);
      LoadUnitFactory.loadUnitIdMap.delete(loadUnit.id);
      LoadUnitLifecycleUtil.clearObjectLifecycle(loadUnit);
    }
  }

  static getLoadUnitById(id: Id): LoadUnit | undefined {
    return LoadUnitFactory.loadUnitIdMap.get(id);
  }

  static registerLoadUnitCreator(type: EggLoadUnitTypeLike, creator: LoadUnitCreator): void {
    const bag = TeggScope.current();
    if (bag) {
      // Boot-time registration inside an app scope: keep it per-app so a creator
      // capturing this app's state never overwrites another concurrent app's.
      let overlay = bag.get(LOAD_UNIT_CREATOR_OVERLAY_SLOT) as Map<EggLoadUnitTypeLike, LoadUnitCreator> | undefined;
      if (!overlay) {
        overlay = new Map();
        bag.set(LOAD_UNIT_CREATOR_OVERLAY_SLOT, overlay);
      }
      overlay.set(type, creator);
      return;
    }
    // Import-time / no-scope registration: app-agnostic, shared base.
    loadUnitCreatorBaseMap.set(type, creator);
  }
}
