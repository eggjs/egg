// init loader
import './lib/AppLoadUnit.ts';
import './lib/AppLoadUnitInstance.ts';
import './lib/EggCompatibleObject.ts';
import { LoadUnitMultiInstanceProtoHook } from '@eggjs/metadata';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { TeggScope } from '@eggjs/tegg-types';
import type { Application, ILifecycleBoot } from 'egg';

import { CompatibleUtil } from './lib/CompatibleUtil.ts';
import { ConfigSourceLoadUnitHook } from './lib/ConfigSourceLoadUnitHook.ts';
import { EggContextCompatibleHook } from './lib/EggContextCompatibleHook.ts';
import { EggContextHandler } from './lib/EggContextHandler.ts';
import { EggModuleLoader } from './lib/EggModuleLoader.ts';
import { EggQualifierProtoHook } from './lib/EggQualifierProtoHook.ts';
import { ModuleHandler } from './lib/ModuleHandler.ts';
import { hijackRunInBackground } from './lib/run_in_background.ts';

export default class TeggAppBoot implements ILifecycleBoot {
  private readonly app: Application;
  private compatibleHook?: EggContextCompatibleHook;
  private eggContextHandler: EggContextHandler;
  private eggQualifierProtoHook: EggQualifierProtoHook;
  private loadUnitMultiInstanceProtoHook: LoadUnitMultiInstanceProtoHook;
  private configSourceEggPrototypeHook: ConfigSourceLoadUnitHook;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad(): void {
    // Establish this app's TeggScope BEFORE any dependent plugin
    // (controller/aop/dal/eventbus) boots, so their boot hooks can resolve the
    // per-app factories/managers from app._teggScopeBag. The teggConfig plugin
    // boots before us and may have already created the bag (it needs the scope
    // for its own configNames loading) — reuse it rather than overwrite, so the
    // configNames it wrote stays reachable.
    this.app._teggScopeBag ??= TeggScope.createBag();
    TeggScope.registerScope(this.app._teggScopeBag);
    this.app.config.coreMiddleware.push('teggCtxLifecycleMiddleware');
  }

  configDidLoad(): void {
    this.eggContextHandler = new EggContextHandler(this.app);
    this.app.eggContextHandler = this.eggContextHandler;
    // register() installs the per-app context callbacks into this app's scope.
    TeggScope.run(this.app._teggScopeBag, () => {
      this.eggContextHandler.register();
    });
    this.app.moduleHandler = new ModuleHandler(this.app);
  }

  async didLoad(): Promise<void> {
    hijackRunInBackground(this.app);
    // Load tegg objects within this app's factory scope so every factory/graph/
    // lifecycle-util mutation during boot reads/writes the per-app slots.
    await TeggScope.run(this.app._teggScopeBag, async () => {
      this.loadUnitMultiInstanceProtoHook = new LoadUnitMultiInstanceProtoHook();
      this.app.loadUnitLifecycleUtil.registerLifecycle(this.loadUnitMultiInstanceProtoHook);

      // wait all file loaded, so app/ctx has all properties
      this.eggQualifierProtoHook = new EggQualifierProtoHook(this.app);
      this.app.loadUnitLifecycleUtil.registerLifecycle(this.eggQualifierProtoHook);

      this.configSourceEggPrototypeHook = new ConfigSourceLoadUnitHook();
      this.app.loadUnitLifecycleUtil.registerLifecycle(this.configSourceEggPrototypeHook);

      // start load tegg objects
      await this.app.moduleHandler.init();
      this.compatibleHook = new EggContextCompatibleHook(this.app.moduleHandler);
      this.app.eggContextLifecycleUtil.registerLifecycle(this.compatibleHook);
    });
  }

  async loadMetadata(): Promise<void> {
    if (!this.app.moduleReferences) return;
    const moduleDescriptors = await LoaderFactory.loadApp(this.app.moduleReferences);
    EggModuleLoader.collectTeggManifest(this.app, moduleDescriptors);
  }

  async beforeClose(): Promise<void> {
    try {
      await TeggScope.run(this.app._teggScopeBag, async () => {
        CompatibleUtil.clean();
        await this.app.moduleHandler.destroy();
        if (this.compatibleHook) {
          this.app.eggContextLifecycleUtil.deleteLifecycle(this.compatibleHook);
        }
        if (this.eggQualifierProtoHook) {
          this.app.loadUnitLifecycleUtil.deleteLifecycle(this.eggQualifierProtoHook);
        }
        if (this.configSourceEggPrototypeHook) {
          this.app.loadUnitLifecycleUtil.deleteLifecycle(this.configSourceEggPrototypeHook);
        }
        if (this.loadUnitMultiInstanceProtoHook) {
          this.app.loadUnitLifecycleUtil.deleteLifecycle(this.loadUnitMultiInstanceProtoHook);
        }
        // per-app multi-instance proto set: cleared within this app's scope
        LoadUnitMultiInstanceProtoHook.clear();
      });
    } finally {
      // The whole per-app scope (bag) is dropped with the app; release the scope
      // so the strict-mode escape fuse reflects the live app count even if the
      // cleanup above throws.
      TeggScope.unregisterScope(this.app._teggScopeBag);
    }
  }
}
