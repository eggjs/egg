import type { EggScheduleConfig } from './config/config.default.ts';

declare module 'egg' {
  interface EggAppConfig {
    /**
     * Schedule Config
     * @see https://www.eggjs.org/zh-CN/basics/schedule
     */
    schedule: EggScheduleConfig;
  }

  interface Application {
    /**
     * Run a schedule, only for unit test
     */
    runSchedule(schedulePath: string, ...args: any[]): Promise<any>;
  }
}
