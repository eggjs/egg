import { loadSchedule } from './load_schedule.ts';
import type { EggScheduleItem } from './types.ts';
import type Application from '../app/extend/application.ts';

export class ScheduleWorker {
  #app: Application;
  scheduleItems: Record<string, EggScheduleItem> = {};

  constructor(app: Application) {
    this.#app = app;
  }

  async init() {
    this.scheduleItems = await loadSchedule(this.#app);
  }

  registerSchedule(scheduleItem: EggScheduleItem) {
    this.scheduleItems[scheduleItem.key] = scheduleItem;
  }

  unregisterSchedule(key: string) {
    delete this.scheduleItems[key];
  }
}
