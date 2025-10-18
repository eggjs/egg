import { debuglog } from 'node:util';

import type { Agent } from 'egg';
import { PrototypeUtil, type EggProtoImplClass } from '@eggjs/tegg';
import { ScheduleMetadata } from '@eggjs/tegg-schedule-decorator';

import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor.ts';

const debug = debuglog('tegg/plugin/schedule/ScheduleSubscriberRegister');

export class ScheduleSubscriberRegister {
  private readonly agent: Agent;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  register(clazz: EggProtoImplClass<object>, metadata: ScheduleMetadata<object>) {
    // bind subscriber
    const schedule = EggScheduleMetadataConvertor.convertToEggSchedule(metadata);
    const path = PrototypeUtil.getFilePath(clazz);
    if (!metadata.disable) {
      this.agent.logger.info('[@eggjs/tegg-schedule-plugin]: register schedule %s', path);
    }

    // TODO: why disable is not used?

    // @ts-expect-error agent registerSchedule only need key and schedule config
    this.agent.schedule.registerSchedule({
      schedule,
      key: path,
    });
    debug('register schedule %s, config: %j', path, schedule);
  }
}
