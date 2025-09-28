import { type PartialEggConfig } from 'egg';
import type { ParserOptions as CronOptions } from 'cron-parser';

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

export default {
  customLogger: {
    scheduleLogger: {
      consoleLevel: 'NONE',
      file: 'egg-schedule.log',
    },
  },
  schedule: {
    directory: [],
  },
} as PartialEggConfig;
