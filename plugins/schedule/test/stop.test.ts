import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type Agent from '../src/app/extend/agent.ts';
import { Scheduler } from '../src/lib/schedule.ts';
import { AllStrategy } from '../src/lib/strategy/all.ts';
import { WorkerStrategy } from '../src/lib/strategy/worker.ts';

describe.each([
  { type: 'worker', Strategy: WorkerStrategy, method: 'sendRandom' },
  { type: 'all', Strategy: AllStrategy, method: 'send' },
] as const)('schedule.close() with $type schedules', ({ type, Strategy, method }) => {
  let scheduler: Scheduler;
  let send: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    send = vi.fn();
    const agent = {
      getLogger: () => ({ info: vi.fn(), warn: vi.fn() }),
      messenger: { [method]: send },
      get schedule() {
        return scheduler;
      },
    };
    scheduler = new Scheduler(agent as unknown as Agent);
    scheduler.use(type, Strategy);
    scheduler.registerSchedule({
      key: 'interval',
      schedule: { type, interval: 10000 },
      scheduleQueryString: '',
      task: async () => {},
    });
    await scheduler.start();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should stop before the first dispatch', async () => {
    await scheduler.close();
    await vi.advanceTimersByTimeAsync(20000);

    expect(send).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('should stop dispatching after an interval has run', async () => {
    await vi.advanceTimersByTimeAsync(10000);
    expect(send).toHaveBeenCalledExactlyOnceWith('egg-schedule', expect.objectContaining({ key: 'interval' }));

    await scheduler.close();
    await vi.advanceTimersByTimeAsync(20000);

    expect(send).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
