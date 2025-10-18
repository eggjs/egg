import { debuglog } from 'node:util';

import type { Application } from 'egg';
import { PrototypeUtil } from '@eggjs/tegg';
import { type EggPrototype } from '@eggjs/tegg-metadata';
import { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';

import { eggScheduleAdapterFactory } from './EggScheduleAdapter.ts';
import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor.ts';

const debug = debuglog('tegg/plugin/schedule/ScheduleWorkerRegister');

export class ScheduleWorkerRegister {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  register(proto: EggPrototype, metadata: ScheduleMetadata<object>) {
    const task = eggScheduleAdapterFactory(proto, metadata);
    const schedule = EggScheduleMetadataConvertor.convertToEggSchedule(metadata);
    const path = proto.getMetaData<string>(PrototypeUtil.FILE_PATH);
    this.app.scheduleWorker.registerSchedule({
      schedule,
      scheduleQueryString: '',
      task,
      key: path,
    });
    debug('register schedule %s, config: %j', path, schedule);
  }
}
