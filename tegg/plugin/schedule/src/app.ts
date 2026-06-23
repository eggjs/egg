import { TeggScope } from '@eggjs/tegg-types';
import type { Application, ILifecycleBoot } from 'egg';

import { ScheduleManager } from './lib/ScheduleManager.ts';
import { SchedulePrototypeHook } from './lib/SchedulePrototypeHook.ts';
import { ScheduleWorkerLoadUnitHook } from './lib/ScheduleWorkerLoadUnitHook.ts';
import { ScheduleWorkerRegister } from './lib/ScheduleWorkerRegister.ts';

export default class ScheduleAppBootHook implements ILifecycleBoot {
  private readonly app: Application;
  private readonly scheduleManager: ScheduleManager;
  private readonly scheduleWorkerRegister: ScheduleWorkerRegister;
  private readonly scheduleWorkerLoadUnitHook: ScheduleWorkerLoadUnitHook;
  private readonly schedulePrototypeHook: SchedulePrototypeHook;

  constructor(app: Application) {
    this.app = app;
    this.scheduleManager = new ScheduleManager(this.app);
    this.scheduleWorkerRegister = new ScheduleWorkerRegister(this.scheduleManager);
    this.scheduleWorkerLoadUnitHook = new ScheduleWorkerLoadUnitHook(this.scheduleWorkerRegister);
    this.schedulePrototypeHook = new SchedulePrototypeHook();
  }

  configWillLoad(): void {
    TeggScope.run(this.app._teggScopeBag, () => {
      this.app.loadUnitLifecycleUtil.registerLifecycle(this.scheduleWorkerLoadUnitHook);
      this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.schedulePrototypeHook);
    });
  }

  async beforeClose(): Promise<void> {
    // Unregister all schedules before deleting lifecycle hooks
    this.scheduleManager.unregisterAll();

    await TeggScope.run(this.app._teggScopeBag, async () => {
      this.app.loadUnitLifecycleUtil.deleteLifecycle(this.scheduleWorkerLoadUnitHook);
      this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.schedulePrototypeHook);
    });
  }
}
