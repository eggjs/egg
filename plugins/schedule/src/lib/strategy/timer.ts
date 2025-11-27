import assert from 'node:assert';

import type { CronExpression } from 'cron-parser';
import cronParser from 'cron-parser';
import { ms } from 'humanize-ms';
import safeTimers from 'safe-timers';
import { logDate } from 'utility';

import type Agent from '../../app/extend/agent.ts';
import type { EggScheduleConfig } from '../../config/config.default.ts';
import { BaseStrategy } from './base.ts';

export abstract class TimerStrategy extends BaseStrategy {
  protected cronInstance?: CronExpression;

  constructor(scheduleConfig: EggScheduleConfig, agent: Agent, key: string) {
    super(scheduleConfig, agent, key);

    const { interval, cron, cronOptions, immediate } = this.scheduleConfig;
    assert(
      interval || cron || immediate,
      `[@eggjs/schedule] ${this.key} \`schedule.interval\` or \`schedule.cron\` or \`schedule.immediate\` must be present`,
    );

    // init cron parser
    if (cron) {
      try {
        this.cronInstance = cronParser.parseExpression(cron, cronOptions);
      } catch (err: any) {
        throw new TypeError(`[@eggjs/schedule] ${this.key} parse cron instruction(${cron}) error: ${err.message}`, {
          cause: err,
        });
      }
    }
  }

  protected handler(): void {
    throw new TypeError(`[@eggjs/schedule] ${this.key} strategy should override \`handler()\` method`);
  }

  async start(): Promise<void> {
    /* istanbul ignore next */
    if (this.agent.schedule.closed) return;

    if (this.scheduleConfig.immediate) {
      this.logger.info(`[Timer] ${this.key} next time will execute immediate`);
      setImmediate(() => this.handler());
    } else {
      this.#scheduleNext();
    }
  }

  #scheduleNext(): void {
    /* istanbul ignore next */
    if (this.agent.schedule.closed) return;

    // get next tick
    const nextTick = this.getNextTick();
    if (nextTick) {
      this.logger.info(
        `[Timer] ${this.key} next time will execute after ${nextTick}ms at ${logDate(new Date(Date.now() + nextTick))}`,
      );
      this.safeTimeout(() => this.handler(), nextTick);
    } else {
      this.logger.info(`[Timer] ${this.key} reach endDate, will stop`);
    }
  }

  onJobStart(): void {
    // Next execution will trigger task at a fix rate, regardless of its execution time.
    this.#scheduleNext();
  }

  /**
   * calculate next tick
   *
   * @return {Number|undefined} time interval, if out of range then return `undefined`
   */
  protected getNextTick(): number | undefined {
    // interval-style
    if (this.scheduleConfig.interval) {
      return ms(this.scheduleConfig.interval);
    }

    // cron-style
    if (this.cronInstance) {
      // calculate next cron tick
      const now = Date.now();
      let nextTick: number;

      // loop to find next feature time
      do {
        try {
          const nextInterval = this.cronInstance.next();
          nextTick = nextInterval.getTime();
        } catch (err) {
          // Error: Out of the timespan range
          this.logger.info(`[Timer] ${this.key} cron out of the timespan range, error: %s`, err);
          return;
        }
      } while (now >= nextTick);
      return nextTick - now;
    }
    // won\'t run here
  }

  protected safeTimeout(handler: () => void, delay: number, ...args: any[]): number | ReturnType<typeof setTimeout> {
    const fn = delay < safeTimers.maxInterval ? setTimeout : safeTimers.setTimeout;
    return fn(handler, delay, ...args) as number | ReturnType<typeof setTimeout>;
  }
}
