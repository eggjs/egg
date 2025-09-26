import { TimerStrategy } from './timer.ts';

export class WorkerStrategy extends TimerStrategy {
  handler() {
    this.sendOne();
  }
}
