import type { EggScheduleConfig } from './config/config.default.ts';

declare module 'egg' {
  interface EggAppConfig {
    /**
     * Schedule Config
     * @see https://www.eggjs.org/zh-CN/basics/schedule
     */
    schedule: EggScheduleConfig;
  }
}

declare module '@eggjs/mock' {
  interface MockApplication {
    runSchedule(schedulePath: string, ...args: any[]): Promise<any>;
  }
}
