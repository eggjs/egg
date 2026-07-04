import { EggLoadUnitType, type LoadUnit, LoadUnitFactory } from '@eggjs/metadata';
import type { GlobalGraphBuildHook } from '@eggjs/metadata';
import {
  INNER_OBJECT_LOAD_UNIT_TYPE,
  InnerObjectLoadUnitBuilder,
  type LoadUnitInstance,
  LoadUnitInstanceFactory,
} from '@eggjs/tegg-runtime';
import type { Application } from 'egg';
import { Base } from 'sdk-base';

import { CompatibleUtil } from './CompatibleUtil.ts';
import { COMPATIBLE_PROTO_IMPLE_TYPE, EggCompatibleProtoImpl } from './EggCompatibleProtoImpl.ts';
import { EggModuleLoader } from './EggModuleLoader.ts';

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

  registerGlobalGraphBuildHook(hook: GlobalGraphBuildHook): void {
    this.loadUnitLoader.registerBuildHook(hook);
  }

  /**
   * Create AND instantiate the InnerObjectLoadUnit before the business graph
   * is built, so `@XxxLifecycleProto` hooks provided by module plugins
   * (including graph build hooks they register in `@LifecyclePostInject`) are
   * live for the business load-unit phases below.
   */
  private async instantiateInnerObjectLoadUnit(): Promise<LoadUnitInstance> {
    const builder = new InnerObjectLoadUnitBuilder();
    for (const moduleDescriptor of this.loadUnitLoader.moduleDescriptors) {
      builder.addInnerObjectClazzList(moduleDescriptor.innerObjectClazzList, {
        name: moduleDescriptor.name,
        path: moduleDescriptor.unitPath,
      });
    }
    const innerObjectLoadUnit = await builder.createLoadUnit({
      innerObjects: {},
    });
    this.loadUnits.push(innerObjectLoadUnit);
    return await LoadUnitInstanceFactory.createLoadUnitInstance(innerObjectLoadUnit);
  }

  async init(): Promise<void> {
    try {
      this.app.eggPrototypeCreatorFactory.registerPrototypeCreator(
        COMPATIBLE_PROTO_IMPLE_TYPE,
        EggCompatibleProtoImpl.create,
      );

      await this.loadUnitLoader.initGraph();
      const innerObjectInstance = await this.instantiateInnerObjectLoadUnit();
      await this.loadUnitLoader.load();
      const instances: LoadUnitInstance[] = [innerObjectInstance];
      this.app.module = {} as any;

      for (const loadUnit of this.loadUnits) {
        if (loadUnit.type === INNER_OBJECT_LOAD_UNIT_TYPE) {
          continue;
        }
        const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
        if (instance.loadUnit.type !== EggLoadUnitType.APP) {
          CompatibleUtil.appCompatible(this.app, instance);
        }
        instances.push(instance);
      }
      CompatibleUtil.contextModuleCompatible(
        this.app.context,
        instances.filter((instance) => instance.loadUnit.type !== INNER_OBJECT_LOAD_UNIT_TYPE),
      );
      this.loadUnitInstances = instances;
      this.ready(true);
    } catch (e) {
      this.ready(e as Error);
      throw e;
    }
  }

  async destroy(): Promise<void> {
    // Reverse creation order: business load units go down first, the
    // InnerObjectLoadUnit last — its lifecycle protos stay registered until
    // every object they may hook has been destroyed.
    if (this.loadUnitInstances) {
      for (const instance of [...this.loadUnitInstances].reverse()) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
    }
    if (this.loadUnits) {
      for (const loadUnit of [...this.loadUnits].reverse()) {
        await LoadUnitFactory.destroyLoadUnit(loadUnit);
      }
    }
  }
}
