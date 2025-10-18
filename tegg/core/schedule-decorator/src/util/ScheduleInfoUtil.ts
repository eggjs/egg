import { MetadataUtil } from '@eggjs/core-decorator';
import { IS_SCHEDULE, SCHEDULE_PARAMS, SCHEDULE_OPTIONS } from '@eggjs/tegg-types';
import type { EggProtoImplClass, ScheduleOptions, ScheduleParams } from '@eggjs/tegg-types';

export class ScheduleInfoUtil {
  static isSchedule(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getBooleanMetaData(IS_SCHEDULE, clazz);
  }

  static setIsSchedule(isSchedule: boolean, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(IS_SCHEDULE, isSchedule, clazz);
  }

  static setScheduleParams<T>(scheduleParams: ScheduleParams<T>, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(SCHEDULE_PARAMS, scheduleParams, clazz);
  }

  static setScheduleOptions(scheduleParams: ScheduleOptions, clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(SCHEDULE_OPTIONS, scheduleParams, clazz);
  }

  static getScheduleOptions(clazz: EggProtoImplClass): ScheduleOptions | undefined {
    return MetadataUtil.getMetaData(SCHEDULE_OPTIONS, clazz);
  }

  static getScheduleParams(clazz: EggProtoImplClass): ScheduleParams<object> | undefined {
    return MetadataUtil.getMetaData(SCHEDULE_PARAMS, clazz);
  }
}
