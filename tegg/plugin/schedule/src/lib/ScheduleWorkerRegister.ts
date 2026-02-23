import { debuglog } from 'node:util';

import { PrototypeUtil } from '@eggjs/core-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import { ScheduleMetadata } from '@eggjs/schedule-decorator';

import { eggScheduleAdapterFactory } from './EggScheduleAdapter.ts';
import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor.ts';
import type { ScheduleManager } from './ScheduleManager.ts';

const debug = debuglog('egg/tegg/plugin/schedule/ScheduleWorkerRegister');

export class ScheduleWorkerRegister {
  private readonly scheduleManager: ScheduleManager;

  constructor(scheduleManager: ScheduleManager) {
    this.scheduleManager = scheduleManager;
  }

  register(proto: EggPrototype, metadata: ScheduleMetadata<object>): void {
    const task = eggScheduleAdapterFactory(proto, metadata);
    const schedule = EggScheduleMetadataConvertor.convertToEggSchedule(metadata);
    const key = proto.getMetaData<string>(PrototypeUtil.FILE_PATH) as string;
    if (!key) {
      throw new Error(`schedule prototype: ${proto.name as string} missing FILE_PATH metadata`);
    }
    this.scheduleManager.register(proto, {
      schedule,
      task,
      key,
    });
    debug('register schedule %s, config: %j', key, schedule);
  }
}
