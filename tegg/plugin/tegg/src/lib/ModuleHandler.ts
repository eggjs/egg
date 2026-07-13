import { EggLoadUnitType, type LoadUnit, LoadUnitFactory } from '@eggjs/metadata';
import type { GlobalGraphBuildHook } from '@eggjs/metadata';
import { ModuleConfigs } from '@eggjs/tegg-common-util';
import { InnerObjectLoadUnitBuilder, type LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { AccessLevel } from '@eggjs/tegg-types';
import type { Application } from 'egg';
import { Base } from 'sdk-base';

import { CompatibleUtil } from './CompatibleUtil.ts';
import { EggAppLoader } from './EggAppLoader.ts';
import { COMPATIBLE_PROTO_IMPLE_TYPE, EggCompatibleProtoImpl } from './EggCompatibleProtoImpl.ts';
import { EggModuleLoader } from './EggModuleLoader.ts';

export class ModuleHandler extends Base {
  loadUnits: LoadUnit[] = [];
  // The inner-object load unit is tracked separately from business load
  // units: init iterates business units without filtering, destroy tears it
  // down last (its lifecycle protos must outlive every hooked object).
  #innerObjectLoadUnit?: LoadUnit;
  #innerObjectLoadUnitInstance?: LoadUnitInstance;
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
      // Optional modules that were NOT promoted (framework-dependency modules
      // whose plugin is disabled, or unused optional modules) must not have
      // their hooks instantiated — graph sort already gates their business
      // protos, this gates their inner objects symmetrically. Enabled
      // plugins' references were promoted to non-optional in buildAppGraph.
      if (moduleDescriptor.optional === true) {
        continue;
      }
      builder.addInnerObjectClazzList(moduleDescriptor.innerObjectClazzList ?? [], {
        name: moduleDescriptor.name,
        path: moduleDescriptor.unitPath,
      });
    }
    // The single copy of the egg host's APP-scoped compat protos (`() => app[name]`
    // for router / logger / runtimeConfig / ...). PUBLIC, so both inner objects AND
    // business modules resolve app properties from here — the app load unit no longer
    // duplicates them. Added AFTER the scanned inner objects so a same-named inner
    // object wins (the compat proto is skipped).
    builder.addCompatibleClazzList(new EggAppLoader(this.app).buildAppSingletonCompatClazzList(), {
      name: 'app',
      path: this.app.baseDir,
    });
    // `moduleConfigs` is the one base object that is NOT a plain app-property
    // compat proto: it is blacklisted in EggAppLoader and consumers want a
    // ModuleConfigs wrapper (not the raw `app.moduleConfigs` map), so it stays
    // an explicit provided inner object. PRIVATE: visible to inner objects only.
    // (`logger` / `router` / `runtimeConfig` now arrive via the compat protos
    // fed above; standalone, which has no egg compat surface, provides its own
    // `logger` through its innerObjects instead.)
    const innerObjectLoadUnit = await builder.createLoadUnit({
      innerObjects: {
        moduleConfigs: [{ obj: new ModuleConfigs(this.app.moduleConfigs), accessLevel: AccessLevel.PRIVATE }],
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
      this.#innerObjectLoadUnitInstance = innerObjectInstance;
      this.loadUnitInstances.push(innerObjectInstance);
      await this.loadUnitLoader.load();
      this.app.module = {} as any;

      const businessInstances: LoadUnitInstance[] = [];
      for (const loadUnit of this.loadUnits) {
        const instance = await LoadUnitInstanceFactory.createLoadUnitInstance(loadUnit);
        if (instance.loadUnit.type !== EggLoadUnitType.APP) {
          CompatibleUtil.appCompatible(this.app, instance);
        }
        this.loadUnitInstances.push(instance);
        businessInstances.push(instance);
      }
      CompatibleUtil.contextModuleCompatible(this.app.context, businessInstances);
      this.ready(true);
    } catch (e) {
      this.ready(e as Error);
      throw e;
    }
  }

  async destroy(): Promise<void> {
    // Reverse creation order: business load units go down first; the inner
    // instance and load unit go down after business load-unit metadata so its
    // lifecycle protos still observe LoadUnitFactory.destroyLoadUnit().
    const innerObjectLoadUnitInstance = this.#innerObjectLoadUnitInstance ?? this.loadUnitInstances[0];
    if (this.loadUnitInstances) {
      const businessInstances = this.loadUnitInstances.filter((instance) => instance !== innerObjectLoadUnitInstance);
      for (const instance of [...businessInstances].reverse()) {
        await LoadUnitInstanceFactory.destroyLoadUnitInstance(instance);
      }
    }
    if (this.loadUnits) {
      for (const loadUnit of [...this.loadUnits].reverse()) {
        await LoadUnitFactory.destroyLoadUnit(loadUnit);
      }
    }
    if (innerObjectLoadUnitInstance) {
      await LoadUnitInstanceFactory.destroyLoadUnitInstance(innerObjectLoadUnitInstance);
      this.#innerObjectLoadUnitInstance = undefined;
    }
    if (this.#innerObjectLoadUnit) {
      await LoadUnitFactory.destroyLoadUnit(this.#innerObjectLoadUnit);
      this.#innerObjectLoadUnit = undefined;
    }
  }
}
