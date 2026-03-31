import { debuglog } from 'node:util';

import { PrototypeUtil } from '@eggjs/core-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import { ScheduleMetadata } from '@eggjs/schedule-decorator';
import { importResolve } from '@eggjs/utils';

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
    const rawKey = proto.getMetaData<string>(PrototypeUtil.FILE_PATH) as string;
    if (!rawKey) {
      throw new Error(`schedule prototype: ${proto.name as string} missing FILE_PATH metadata`);
    }
    // Normalize the key with importResolve to match how runSchedule() resolves paths.
    // Without this, tegg-registered schedules use the raw FILE_PATH (e.g., .ts source path)
    // while runSchedule() applies importResolve() which may resolve to a different path.
    const key = importResolve(rawKey);
    this.scheduleManager.register(proto, {
      schedule,
      task,
      key,
    });
    debug('register schedule %s (raw: %s), config: %j', key, rawKey, schedule);
  }
}
