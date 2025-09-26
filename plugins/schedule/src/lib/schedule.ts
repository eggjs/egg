import { debuglog } from 'node:util';

import type { EggLogger } from 'egg';

import { loadSchedule } from './load_schedule.ts';
import type { EggScheduleItem, EggScheduleJobInfo } from './types.ts';
import type { BaseStrategy } from './strategy/base.ts';
import type Agent from '../app/extend/agent.ts';

const debug = debuglog('egg/schedule/lib/schedule');

export class Schedule {
  closed = false;

  #agent: Agent;
  #logger: EggLogger;
  #strategyClassMap = new Map<string, typeof BaseStrategy>();
  #strategyInstanceMap = new Map<string, BaseStrategy>();

  constructor(agent: Agent) {
    this.#agent = agent;
    this.#logger = agent.getLogger('scheduleLogger');
  }

  /**
   * register a custom Schedule Strategy
   * @param {String} type - strategy type
   * @param {Strategy} clz - Strategy class
   */
  use(type: string, clz: typeof BaseStrategy) {
    this.#strategyClassMap.set(type, clz);
    debug('use type: %o', type);
  }

  /**
   * load all schedule jobs, then initialize and register special strategy
   */
  async init() {
    const scheduleItems = await loadSchedule(this.#agent);
    for (const scheduleItem of Object.values(scheduleItems)) {
      this.registerSchedule(scheduleItem);
    }
  }

  registerSchedule(scheduleItem: EggScheduleItem) {
    const { key, schedule } = scheduleItem;
    const type = schedule.type;
    if (schedule.disable) {
      return;
    }

    // find Strategy by type
    const Strategy = this.#strategyClassMap.get(type!);
    if (!Strategy) {
      const err = new Error(`schedule type [${type}] is not defined`);
      err.name = 'EggScheduleError';
      throw err;
    }

    // Initialize strategy and register
    const instance = new Strategy(schedule, this.#agent, key);
    this.#strategyInstanceMap.set(key, instance);
    debug('registerSchedule type: %o, config: %o, key: %o', type, schedule, key);
  }

  unregisterSchedule(key: string) {
    debug('unregisterSchedule key: %o', key);
    return this.#strategyInstanceMap.delete(key);
  }

  /**
   * job finish event handler
   *
   * @param {Object} info - { id, key, success, message, workerId }
   */
  onJobFinish(info: EggScheduleJobInfo) {
    this.#logger.debug(`[Job#${info.id}] ${info.key} finish event received by agent from worker#${info.workerId}`);
    const instance = this.#strategyInstanceMap.get(info.key);
    /* istanbul ignore else */
    if (instance) {
      instance.onJobFinish(info);
    }
  }

  /**
   * start schedule
   */
  async start() {
    debug('start');
    this.closed = false;
    for (const instance of this.#strategyInstanceMap.values()) {
      instance.start();
    }
  }

  async close() {
    this.closed = true;
    for (const instance of this.#strategyInstanceMap.values()) {
      await instance.close();
    }
    debug('close');
  }
}
