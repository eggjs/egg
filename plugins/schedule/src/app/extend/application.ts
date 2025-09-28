import { Application } from 'egg';

import { ScheduleWorker } from '../../lib/schedule_worker.ts';

const SCHEDULE_WORKER = Symbol('application scheduleWorker');

export default class ScheduleApplication extends Application {
  /**
   * @member app#schedule
   */
  get scheduleWorker() {
    let scheduleWorker = this[SCHEDULE_WORKER] as ScheduleWorker;
    if (!scheduleWorker) {
      this[SCHEDULE_WORKER] = scheduleWorker = new ScheduleWorker(this);
    }
    return scheduleWorker;
  }
}
