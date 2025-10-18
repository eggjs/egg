import type { Application, ILifecycleBoot } from 'egg';

import { ScheduleWorkerRegister } from './lib/ScheduleWorkerRegister.ts';
import { ScheduleWorkerLoadUnitHook } from './lib/ScheduleWorkerLoadUnitHook.ts';
import { SchedulePrototypeHook } from './lib/SchedulePrototypeHook.ts';

export default class ScheduleAppBootHook implements ILifecycleBoot {
  private readonly app: Application;
  private readonly scheduleWorkerRegister: ScheduleWorkerRegister;
  private readonly scheduleWorkerLoadUnitHook: ScheduleWorkerLoadUnitHook;
  private readonly schedulePrototypeHook: SchedulePrototypeHook;

  constructor(app: Application) {
    this.app = app;
    this.scheduleWorkerRegister = new ScheduleWorkerRegister(this.app);
    this.scheduleWorkerLoadUnitHook = new ScheduleWorkerLoadUnitHook(this.scheduleWorkerRegister);
    this.schedulePrototypeHook = new SchedulePrototypeHook();
  }

  configWillLoad() {
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.scheduleWorkerLoadUnitHook);
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.schedulePrototypeHook);
  }

  async beforeClose() {
    this.app.loadUnitLifecycleUtil.deleteLifecycle(this.scheduleWorkerLoadUnitHook);
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.schedulePrototypeHook);
  }
}
