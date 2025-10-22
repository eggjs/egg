import { Base } from 'sdk-base';
import type { Application } from 'egg';
import { EggLoadUnitType, type LoadUnit, LoadUnitFactory } from '@eggjs/tegg-metadata';
import { type LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';

import { EggModuleLoader } from './EggModuleLoader.ts';
import { CompatibleUtil } from './CompatibleUtil.ts';
import { COMPATIBLE_PROTO_IMPLE_TYPE, EggCompatibleProtoImpl } from './EggCompatibleProtoImpl.ts';

export class ModuleHandler extends Base {
  loadUnits: LoadUnit[] = [];
  loadUnitInstances: LoadUnitInstance[] = [];

  private readonly loadUnitLoader: EggModuleLoader;
  private readonly app: Application;

  constructor(app: Application) {
    super();
    this.app = app;
    this.loadUnitLoader = new EggModuleLoader(this.app);
  }

  async init(): Promise<void> {
    try {
      this.app.eggPrototypeCreatorFactory.registerPrototypeCreator(
        COMPATIBLE_PROTO_IMPLE_TYPE,
        EggCompatibleProtoImpl.create,
      );

      await this.loadUnitLoader.load();
      const instances: LoadUnitInstance[] = [];
      this.app.module = {} as any;

      for (const loadUnit of this.loadUnits) {
        const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
        if (instance.loadUnit.type !== EggLoadUnitType.APP) {
          CompatibleUtil.appCompatible(this.app, instance);
        }
        instances.push(instance);
      }
      CompatibleUtil.contextModuleCompatible(this.app.context, instances);
      this.loadUnitInstances = instances;
      this.ready(true);
    } catch (e) {
      this.ready(e as Error);
      throw e;
    }
  }

  async destroy(): Promise<void> {
    if (this.loadUnitInstances) {
      for (const instance of this.loadUnitInstances) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
    }
    if (this.loadUnits) {
      for (const loadUnit of this.loadUnits) {
        await LoadUnitFactory.destroyLoadUnit(loadUnit);
      }
    }
  }
}
