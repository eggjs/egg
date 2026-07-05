import assert from 'node:assert';

import { GlobalGraph } from '@eggjs/metadata';
import type { Application, ILifecycleBoot } from 'egg';

import { AopContextHook } from './lib/AopContextHook.ts';

export default class AopAppHook implements ILifecycleBoot {
  private readonly app: Application;
  private aopContextHook: AopContextHook;

  constructor(app: Application) {
    this.app = app;
  }

  configDidLoad(): void {
    // The AOP hooks are module plugin classes (@XxxLifecycleProto /
    // @InnerObjectProto, incl. the graph build hook registrar): buffer them on
    // the moduleHandler (created in the tegg plugin's configDidLoad, which runs
    // before ours) so they are instantiated inside the InnerObjectLoadUnit —
    // after the business GlobalGraph is created and before build() runs.
    // Registration/deregistration is automatic.
  }

  async didLoad(): Promise<void> {
    await this.app.moduleHandler.ready();
    // The graph already ran the declaratively registered build hooks during
    // build. Resolve the per-app graph for the sanity assert.
    assert(GlobalGraph.instanceFor(this.app._teggScopeBag), 'GlobalGraph.instance is not set');
    // Deliberately NOT a module plugin (@EggContextLifecycleProto), for two
    // reasons: (1) timing — it snapshots moduleHandler.loadUnitInstances,
    // which is only populated AFTER the business load units exist, i.e.
    // outside the inner-object instantiation window; (2) host boundary — it
    // is egg-controller compatibility wiring depending on the egg
    // moduleHandler, while this plugin package is the aop module for BOTH
    // hosts (the standalone scan must not instantiate it). Host boot wiring
    // stays imperative; being a per-request ctx hook, late registration is
    // harmless.
    this.aopContextHook = new AopContextHook(this.app.moduleHandler);
    this.app.eggContextLifecycleUtil.registerLifecycle(this.aopContextHook);
  }

  async beforeClose(): Promise<void> {
    this.app.eggContextLifecycleUtil.deleteLifecycle(this.aopContextHook);
  }
}
