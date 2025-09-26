import type { ParserOptions as CronOptions } from 'cron-parser';

/**
 * Schedule Config
 * @see https://www.eggjs.org/zh-CN/basics/schedule
 */
export interface EggScheduleConfig {
  type?: 'worker' | 'all';
  interval?: string | number;
  cron?: string;
  cronOptions?: CronOptions;
  immediate?: boolean;
  disable?: boolean;
  env?: string[];
  /**
   * custom additional directory, full path
   */
  directory: string[];
}

export type EggScheduleTask = (ctx: any, ...args: any[]) => Promise<void>;

export interface EggScheduleItem {
  schedule: EggScheduleConfig;
  scheduleQueryString: string;
  task: EggScheduleTask;
  key: string;
}

export interface EggScheduleJobInfo {
  id: string;
  key: string;
  workerId: number;
  args: any[];
  success?: boolean;
  message?: string;
  rt?: number;
}

declare module 'egg' {
  interface EggAppConfig {
    schedule: EggScheduleConfig;
  }
}
