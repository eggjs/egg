import { loadSchedule } from './load_schedule.ts';
import type { EggScheduleItem } from './types.ts';
import type Application from '../app/extend/application.ts';

export class ScheduleWorker {
  #app: Application;
  scheduleItems: Record<string, EggScheduleItem> = {};

  constructor(app: Application) {
    this.#app = app;
  }

  async init(): Promise<void> {
    const schedules = await loadSchedule(this.#app);
    for (const key in schedules) {
      this.scheduleItems[key] = schedules[key];
    }
  }

  registerSchedule(scheduleItem: EggScheduleItem): void {
    this.scheduleItems[scheduleItem.key] = scheduleItem;
  }

  unregisterSchedule(key: string): void {
    delete this.scheduleItems[key];
  }
}
