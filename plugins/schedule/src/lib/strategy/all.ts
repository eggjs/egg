import { TimerStrategy } from './timer.ts';

export class AllStrategy extends TimerStrategy {
  handler(): void {
    this.sendAll();
  }
}
