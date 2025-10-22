import type { ScheduleTypeLike } from '@eggjs/tegg-types';

export class ScheduleMetadata<T> {
  type: ScheduleTypeLike;
  scheduleData: T;
  immediate: boolean;
  disable: boolean;
  env?: string[];

  constructor(type: ScheduleTypeLike, data: T, immediate: boolean, disable: boolean, env?: string[]) {
    this.type = type;
    this.scheduleData = data;
    this.immediate = immediate;
    this.disable = disable;
    this.env = env;
  }

  shouldRegister(env: string): boolean {
    if (!this.env) return true;
    return this.env.includes(env);
  }
}
