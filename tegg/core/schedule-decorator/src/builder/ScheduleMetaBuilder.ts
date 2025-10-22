import type { EggProtoImplClass, ScheduleOptions } from '@eggjs/tegg-types';

import { ScheduleMetadata } from '../model/index.ts';
import { ScheduleInfoUtil } from '../util/index.ts';

const DEFAULT_SCHEDULE_OPTIONS: ScheduleOptions = {
  immediate: false,
  disable: false,
  env: undefined,
};

export class ScheduleMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): ScheduleMetadata<object> {
    const params = ScheduleInfoUtil.getScheduleParams(this.clazz);
    if (!params) {
      throw new Error(`class ${this.clazz.name} is not a schedule`);
    }
    const options = ScheduleInfoUtil.getScheduleOptions(this.clazz);
    const scheduleOptions = Object.assign({}, DEFAULT_SCHEDULE_OPTIONS, options);
    return new ScheduleMetadata<object>(
      params.type,
      params.scheduleData,
      scheduleOptions.immediate!,
      scheduleOptions.disable!,
      scheduleOptions.env,
    );
  }
}
