import { TimerStrategy } from './timer.ts';

export class WorkerStrategy extends TimerStrategy {
  handler(): void {
    this.sendOne();
  }
}
