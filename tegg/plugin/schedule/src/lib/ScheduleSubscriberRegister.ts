import { debuglog } from 'node:util';

import { PrototypeUtil, type EggProtoImplClass } from '@eggjs/core-decorator';
import { ScheduleMetadata } from '@eggjs/schedule-decorator';
import type { Agent } from 'egg';

import { EggScheduleMetadataConvertor } from './EggScheduleMetadataConvertor.ts';

const debug = debuglog('egg/tegg/plugin/schedule/ScheduleSubscriberRegister');

export class ScheduleSubscriberRegister {
  private readonly agent: Agent;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  register(clazz: EggProtoImplClass<object>, metadata: ScheduleMetadata<object>): void {
    // bind subscriber
    const schedule = EggScheduleMetadataConvertor.convertToEggSchedule(metadata);
    const path = PrototypeUtil.getFilePath(clazz) as string;
    if (!metadata.disable) {
      this.agent.logger.info('[@eggjs/schedule-plugin]: register schedule %s', path);
    }

    // TODO: why disable is not used?
    // @ts-expect-error: agent registerSchedule only need key and schedule config
    this.agent.schedule.registerSchedule({
      schedule,
      key: path,
    });
    debug('register schedule %s, config: %j', path, schedule);
  }
}
