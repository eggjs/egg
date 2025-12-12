import type { ParserOptions as CronOptions } from 'cron-parser';
import type { PartialEggConfig } from 'egg';

export type { CronOptions };

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
  directory?: string[];
}

const config: PartialEggConfig = {
  customLogger: {
    scheduleLogger: {
      consoleLevel: 'NONE',
      file: 'egg-schedule.log',
    },
  },
  schedule: {
    directory: [],
  },
};

export default config;
