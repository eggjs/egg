import type { LifecycleHook } from '@eggjs/tegg';
import { IS_SCHEDULE, SCHEDULE_METADATA, type ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';
import type { LoadUnit, LoadUnitLifecycleContext } from '@eggjs/tegg-metadata';

import type { ScheduleWorkerRegister } from './ScheduleWorkerRegister.ts';

export class ScheduleWorkerLoadUnitHook implements LifecycleHook<LoadUnitLifecycleContext, LoadUnit> {
  private readonly scheduleWorkerRegister: ScheduleWorkerRegister;

  constructor(scheduleWorkerRegister: ScheduleWorkerRegister) {
    this.scheduleWorkerRegister = scheduleWorkerRegister;
  }

  async postCreate(_: LoadUnitLifecycleContext, obj: LoadUnit): Promise<void> {
    const iterator = obj.iterateEggPrototype();
    for (const proto of iterator) {
      if (!proto.getMetaData(IS_SCHEDULE)) {
        continue;
      }
      const metadata: ScheduleMetadata<object> | undefined = proto.getMetaData(SCHEDULE_METADATA);
      if (!metadata) {
        continue;
      }
      this.scheduleWorkerRegister.register(proto, metadata);
    }
  }
}
