import { TeggScope } from '@eggjs/tegg-types';
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
    TeggScope.run(this.app._teggScopeBag, () => {
      this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.eventbusProtoHook);
      this.app.loadUnitLifecycleUtil.registerLifecycle(this.eventbusLoadUnitHook);
    });
  }

  async didLoad(): Promise<void> {
    await this.app.moduleHandler.ready();
    // register() resolves the per-app EventHandler/EventContext singletons and
    // installs the per-app context creator — must run in this app's scope.
    await TeggScope.run(this.app._teggScopeBag, async () => {
      await this.eventHandlerProtoManager.register();
    });
  }

  async beforeClose(): Promise<void> {
    await TeggScope.run(this.app._teggScopeBag, async () => {
      this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.eventbusProtoHook);
      this.app.loadUnitLifecycleUtil.deleteLifecycle(this.eventbusLoadUnitHook);
    });
  }
}
