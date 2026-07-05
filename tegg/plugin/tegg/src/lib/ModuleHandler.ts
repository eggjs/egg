import { EggLoadUnitType, type LoadUnit, LoadUnitFactory } from '@eggjs/metadata';
import type { GlobalGraphBuildHook } from '@eggjs/metadata';
import { ModuleConfigs } from '@eggjs/tegg-common-util';
import {
  InnerObjectLoadUnitBuilder,
  type InnerObjectModuleReference,
  type LoadUnitInstance,
  LoadUnitInstanceFactory,
} from '@eggjs/tegg-runtime';
import { AccessLevel, type EggProtoImplClass } from '@eggjs/tegg-types';
import type { Application } from 'egg';
import { Base } from 'sdk-base';

import { CompatibleUtil } from './CompatibleUtil.ts';
import { COMPATIBLE_PROTO_IMPLE_TYPE, EggCompatibleProtoImpl } from './EggCompatibleProtoImpl.ts';
import { EggModuleLoader } from './EggModuleLoader.ts';

export class ModuleHandler extends Base {
  loadUnits: LoadUnit[] = [];
  // The inner-object load unit is tracked separately from business load
  // units: init iterates business units without filtering, destroy tears it
  // down last (its lifecycle protos must outlive every hooked object).
  #innerObjectLoadUnit?: LoadUnit;
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

  readonly #innerObjectClazzRegistrations: Array<{
    clazzList: readonly EggProtoImplClass[];
    moduleReference: InnerObjectModuleReference;
  }> = [];

  /**
   * Buffer framework module plugin classes (`@InnerObjectProto` /
   * `@XxxLifecycleProto`) provided by other egg plugins. They are instantiated
   * in the InnerObjectLoadUnit during init(), before any business load unit is
   * created. Call from configDidLoad or the synchronous part of didLoad.
   */
  registerInnerObjectClazzList(
    clazzList: readonly EggProtoImplClass[],
    moduleReference: InnerObjectModuleReference,
  ): void {
    this.#innerObjectClazzRegistrations.push({ clazzList, moduleReference });
  }

  /**
   * Create AND instantiate the InnerObjectLoadUnit before the business graph
   * is built, so `@XxxLifecycleProto` hooks provided by module plugins
   * (including graph build hooks they register in `@LifecyclePostInject`) are
   * live for the business load-unit phases below.
   */
  private async instantiateInnerObjectLoadUnit(): Promise<LoadUnitInstance> {
    const builder = new InnerObjectLoadUnitBuilder();
    for (const { clazzList, moduleReference } of this.#innerObjectClazzRegistrations) {
      builder.addInnerObjectClazzList(clazzList, moduleReference);
    }
    for (const moduleDescriptor of this.loadUnitLoader.moduleDescriptors) {
      builder.addInnerObjectClazzList(moduleDescriptor.innerObjectClazzList, {
        name: moduleDescriptor.name,
        path: moduleDescriptor.unitPath,
      });
    }
    const innerObjectLoadUnit = await builder.createLoadUnit({
      // Base host objects for framework hooks — the SAME instances mounted on
      // `app`, fed through the host-agnostic provided-objects contract. They
      // cannot resolve via the egg compatible mechanism (EggAppLoader's
      // COMPATIBLE protos): that load unit is only created in load(), AFTER
      // this unit — which must instantiate first so its lifecycle hooks see
      // every later load unit, egg-app included. PRIVATE: the egg host has
      // its own resolution surface for these names (egg compatible objects),
      // the provided protos must stay visible to inner objects only.
      innerObjects: {
        moduleConfigs: [{ obj: new ModuleConfigs(this.app.moduleConfigs), accessLevel: AccessLevel.PRIVATE }],
        runtimeConfig: [
          {
            obj: {
              baseDir: this.app.baseDir,
              env: this.app.config.env,
              name: this.app.name,
            },
            accessLevel: AccessLevel.PRIVATE,
          },
        ],
        logger: [{ obj: this.app.logger, accessLevel: AccessLevel.PRIVATE }],
      },
    });
    this.#innerObjectLoadUnit = innerObjectLoadUnit;
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

      const businessInstances: LoadUnitInstance[] = [];
      for (const loadUnit of this.loadUnits) {
        const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
        if (instance.loadUnit.type !== EggLoadUnitType.APP) {
          CompatibleUtil.appCompatible(this.app, instance);
        }
        instances.push(instance);
        businessInstances.push(instance);
      }
      CompatibleUtil.contextModuleCompatible(this.app.context, businessInstances);
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
    if (this.#innerObjectLoadUnit) {
      await LoadUnitFactory.destroyLoadUnit(this.#innerObjectLoadUnit);
      this.#innerObjectLoadUnit = undefined;
    }
  }
}
