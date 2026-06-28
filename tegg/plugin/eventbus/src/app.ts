import type { Application, ILifecycleBoot } from 'egg';

import { EventbusLoadUnitHook } from './lib/EventbusLoadUnitHook.ts';
import { EventbusProtoHook } from './lib/EventbusProtoHook.ts';
import { EventHandlerProtoManager } from './lib/EventHandlerProtoManager.ts';

export default class EventbusAppHook implements ILifecycleBoot {
  private readonly app: Application;
  private readonly eventHandlerProtoManager: EventHandlerProtoManager;
  private readonly eventbusLoadUnitHook: EventbusLoadUnitHook;
  private readonly eventbusProtoHook: EventbusProtoHook;

  constructor(app: Application) {
    this.app = app;
    this.eventHandlerProtoManager = new EventHandlerProtoManager(app);
    this.eventbusLoadUnitHook = new EventbusLoadUnitHook();
    this.eventbusProtoHook = new EventbusProtoHook(this.eventHandlerProtoManager);
  }

  configDidLoad(): void {
    // app.*LifecycleUtil getters are pinned to this app's scope bag — no run wrap needed.
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.eventbusProtoHook);
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.eventbusLoadUnitHook);
  }

  async didLoad(): Promise<void> {
    await this.app.moduleHandler.ready();
    // register() resolves the per-app singletons through app.getEggObject (which
    // wraps in this app's scope itself), so no outer run wrap is needed.
    await this.eventHandlerProtoManager.register();
  }

  async beforeClose(): Promise<void> {
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.eventbusProtoHook);
    this.app.loadUnitLifecycleUtil.deleteLifecycle(this.eventbusLoadUnitHook);
  }
}
