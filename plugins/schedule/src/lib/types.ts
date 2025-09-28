import type { EggScheduleConfig } from '../config/config.default.ts';

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
