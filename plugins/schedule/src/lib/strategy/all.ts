import { TimerStrategy } from './timer.ts';

export class AllStrategy extends TimerStrategy {
  handler() {
    this.sendAll();
  }
}
