import { debuglog } from 'node:util';

import type { ILifecycleBoot } from 'egg';

import { WorkerStrategy } from './lib/strategy/worker.ts';
import { AllStrategy } from './lib/strategy/all.ts';
import type { EggScheduleJobInfo } from './lib/types.ts';
import type Agent from './app/extend/agent.ts';

const debug = debuglog('egg/schedule/agent');

export default class Boot implements ILifecycleBoot {
  #agent: Agent;
  constructor(agent: Agent) {
    this.#agent = agent;
  }

  async configDidLoad(): Promise<void> {
    // register built-in strategy
    this.#agent.schedule.use('worker', WorkerStrategy);
    this.#agent.schedule.use('all', AllStrategy);

    // wait for other plugin to register custom strategy
    await this.#agent.schedule.init();

    // dispatch job finish event to strategy
    this.#agent.messenger.on('egg-schedule', (info: EggScheduleJobInfo) => {
      // get job info from worker
      this.#agent.schedule.onJobFinish(info);
    });
    debug('configDidLoad');
  }

  async serverDidReady(): Promise<void> {
    // start schedule after worker ready
    await this.#agent.schedule.start();
    debug('serverDidReady, schedule start');
  }

  async beforeClose(): Promise<void> {
    // stop schedule before app close
    await this.#agent.schedule.close();
    debug('beforeClose, schedule close');
  }
}
