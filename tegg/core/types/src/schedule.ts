import type { EggEnvType } from 'egg';
import type { CronOptions } from 'egg/schedule';

export const ScheduleType = {
  WORKER: 'worker',
  ALL: 'all',
} as const;
export type ScheduleType = (typeof ScheduleType)[keyof typeof ScheduleType];

export const IS_SCHEDULE: symbol = Symbol.for('EggPrototype#isSchedule');
export const SCHEDULE_PARAMS: symbol = Symbol.for('EggPrototype#schedule#params');
export const SCHEDULE_OPTIONS: symbol = Symbol.for('EggPrototype#schedule#options');
export const SCHEDULE_METADATA: symbol = Symbol.for('EggPrototype#schedule#metadata');

export type ScheduleTypeLike = ScheduleType | string;

export interface ScheduleParams<T> {
  type: ScheduleTypeLike;
  scheduleData: T;
}

export interface CronParams {
  cron: string;
  cronOptions?: CronOptions;
}

export interface IntervalParams {
  interval: string | number;
}

export type CronScheduleParams = ScheduleParams<CronParams>;
export type IntervalScheduleParams = ScheduleParams<IntervalParams>;

export interface ScheduleOptions {
  // default is false
  immediate?: boolean;
  // default is false
  disable?: boolean;
  // if env has value, only run in this envs
  env?: EggEnvType[];
}

/**
 * Schedule subscriber interface
 *
 * @example
 * ```typescript
 * export class FooSubscriber implements ScheduleSubscriber {
 *   async subscribe(data?: any): Promise<any> {
 *     return 'foo';
 *   }
 * }
 * ```
 */
export interface ScheduleSubscriber {
  subscribe(data?: any): Promise<any>;
}
