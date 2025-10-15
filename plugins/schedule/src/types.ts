import type { EggScheduleConfig } from "./config/config.default.ts";
import type { Schedule } from "./lib/schedule.ts";
import type { ScheduleWorker } from "./lib/schedule_worker.ts";
import type { BaseStrategy } from "./lib/strategy/base.ts";
import type { TimerStrategy } from "./lib/strategy/timer.ts";

declare module "egg" {
  interface EggAppConfig {
    /**
     * Schedule Config
     * @see https://www.eggjs.org/zh-CN/basics/schedule
     */
    schedule: EggScheduleConfig;
  }

  interface Agent {
    /**
     * Schedule Strategy
     */
    ScheduleStrategy: typeof BaseStrategy;

    /**
     * Timer Schedule Strategy
     */
    TimerScheduleStrategy: typeof TimerStrategy;

    /**
     * Schedule
     */
    schedule: Schedule;
  }

  interface Application {
    /**
     * Schedule Worker
     */
    scheduleWorker: ScheduleWorker;
    /**
     * Run a schedule, only for unit test
     */
    runSchedule(schedulePath: string, ...args: any[]): Promise<any>;
  }
}
