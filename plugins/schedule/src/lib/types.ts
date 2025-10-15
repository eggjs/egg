import type { Context } from "egg";

import type { EggScheduleConfig } from "../config/config.default.ts";

export type EggScheduleTaskOptions = Omit<EggScheduleConfig, "directory">;
export type EggScheduleTask = (ctx: Context, ...args: any[]) => Promise<void>;

/**
 * Schedule handler interface
 */
export interface EggScheduleHandler {
  schedule: EggScheduleTaskOptions;
  task: EggScheduleTask;
}

export interface EggScheduleItem {
  schedule: EggScheduleTaskOptions;
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
