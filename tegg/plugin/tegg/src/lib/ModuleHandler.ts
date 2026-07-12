import { EggLoadUnitType, type LoadUnit, LoadUnitFactory } from '@eggjs/metadata';
import type { GlobalGraphBuildHook } from '@eggjs/metadata';
import { ModuleConfigs } from '@eggjs/tegg-common-util';
import { InnerObjectLoadUnitBuilder, type LoadUnitInstance, LoadUnitInstanceFactory } from '@eggjs/tegg-runtime';
import { AccessLevel } from '@eggjs/tegg-types';
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
        logger: [{ obj: this.app.logger, accessLevel: AccessLevel.PRIVATE }],
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
        // The egg router, handed in so inner objects (e.g. the controller
        // plugin's httpRegisterProvider) can inject it instead of closing over
        // `app`. Named `httpRouter`, NOT `router`, on purpose: `router` is an
        // app property, so EggQualifierProtoHook would stamp any `router`
        // injection with EggQualifier=APP and route it to the egg compatible
        // app proto (a different load unit) instead of this provided inner
        // object. PRIVATE: visible to inner objects only.
        httpRouter: [{ obj: this.app.router, accessLevel: AccessLevel.PRIVATE }],
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
