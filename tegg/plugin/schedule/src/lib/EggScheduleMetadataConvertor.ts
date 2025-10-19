import type { EggAppConfig } from 'egg';
import { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';

type EggScheduleConfig = EggAppConfig['schedule'];

export class EggScheduleMetadataConvertor {
  /**
   * convert to egg schedule config
   */
  static convertToEggSchedule(metadata: ScheduleMetadata<object>) {
    return {
      ...metadata.scheduleData,
      type: metadata.type,
      env: metadata.env,
      disable: metadata.disable,
      immediate: metadata.immediate,
    } as EggScheduleConfig;
  }
}
