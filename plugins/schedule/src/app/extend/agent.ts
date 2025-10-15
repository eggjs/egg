import { Agent } from "egg";

import { BaseStrategy } from "../../lib/strategy/base.ts";
import { TimerStrategy } from "../../lib/strategy/timer.ts";
import { Schedule } from "../../lib/schedule.ts";

const SCHEDULE = Symbol("agent schedule");

export default class ScheduleAgent extends Agent {
  /**
   * @member agent#ScheduleStrategy
   */
  get ScheduleStrategy(): typeof BaseStrategy {
    return BaseStrategy;
  }

  /**
   * @member agent#TimerScheduleStrategy
   */
  get TimerScheduleStrategy(): typeof TimerStrategy {
    return TimerStrategy;
  }

  /**
   * @member agent#schedule
   */
  get schedule(): Schedule {
    let schedule = this[SCHEDULE] as Schedule;
    if (!schedule) {
      this[SCHEDULE] = schedule = new Schedule(this);
    }
    return schedule;
  }
}
