import { Agent } from 'egg';

import { BaseStrategy } from '../../lib/strategy/base.ts';
import { TimerStrategy } from '../../lib/strategy/timer.ts';
import { Schedule } from '../../lib/schedule.ts';

const SCHEDULE = Symbol('agent schedule');

export default class ScheduleAgent extends Agent {
  /**
   * @member agent#ScheduleStrategy
   */
  get ScheduleStrategy() {
    return BaseStrategy;
  }

  /**
   * @member agent#TimerScheduleStrategy
   */
  get TimerScheduleStrategy() {
    return TimerStrategy;
  }

  /**
   * @member agent#schedule
   */
  get schedule() {
    let schedule = this[SCHEDULE] as Schedule;
    if (!schedule) {
      this[SCHEDULE] = schedule = new Schedule(this);
    }
    return schedule;
  }
}
