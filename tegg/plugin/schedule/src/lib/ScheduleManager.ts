import { PrototypeUtil } from '@eggjs/core-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import type { Application } from 'egg';

/**
 * Manager class to track registered schedules and handle cleanup
 */
export class ScheduleManager {
  private readonly app: Application;
  // Map of schedule key to EggPrototype
  private readonly registeredSchedules: Map<string, EggPrototype> = new Map();

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Register a schedule and track it
   */
  register(proto: EggPrototype, scheduleItem: { schedule: object; task: any; key: string }): void {
    const { key } = scheduleItem;
    this.registeredSchedules.set(key, proto);
    (this.app as any).scheduleWorker.registerSchedule(scheduleItem);
  }

  /**
   * Unregister a single schedule by prototype
   */
  unregister(proto: EggPrototype): void {
    const key = proto.getMetaData(PrototypeUtil.FILE_PATH) as string;
    if (this.registeredSchedules.has(key)) {
      (this.app as any).scheduleWorker.unregisterSchedule(key);
      this.registeredSchedules.delete(key);
    }
  }

  /**
   * Unregister all tracked schedules
   * Called during app beforeClose
   */
  unregisterAll(): void {
    for (const key of this.registeredSchedules.keys()) {
      (this.app as any).scheduleWorker.unregisterSchedule(key);
    }
    this.registeredSchedules.clear();
  }

  /**
   * Get the count of registered schedules
   */
  get size(): number {
    return this.registeredSchedules.size;
  }
}
