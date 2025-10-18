import { Agent, type ILifecycleBoot } from 'egg';
import { LoaderFactory } from '@eggjs/tegg-loader';
import { EggLoadUnitType } from '@eggjs/tegg-metadata';
import { ScheduleInfoUtil, ScheduleMetaBuilder } from '@eggjs/tegg/schedule';

import { ScheduleSubscriberRegister } from './lib/ScheduleSubscriberRegister.ts';

export default class ScheduleAppBootHook implements ILifecycleBoot {
  private readonly agent: Agent;
  private readonly scheduleSubscriberRegister: ScheduleSubscriberRegister;

  constructor(agent: Agent) {
    this.agent = agent;
    this.scheduleSubscriberRegister = new ScheduleSubscriberRegister(this.agent);
  }

  async didLoad() {
    // FIXME: tegg use lots singleton, in mm.app test case, agent/app in one process
    // if use start tegg in agent, the app will use the same singleton
    // so we should refactor tegg to not use singleton.
    for (const moduleConfig of this.agent.moduleReferences) {
      const loader = LoaderFactory.createLoader(moduleConfig.path, EggLoadUnitType.MODULE);
      const clazzList = await loader.load();
      for (const clazz of clazzList) {
        if (ScheduleInfoUtil.isSchedule(clazz)) {
          const builder = new ScheduleMetaBuilder(clazz);
          const metadata = builder.build();
          this.scheduleSubscriberRegister.register(clazz, metadata);
        }
      }
    }
  }
}
