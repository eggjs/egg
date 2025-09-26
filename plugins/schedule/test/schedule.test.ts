import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

import { importResolve } from '@eggjs/utils';
import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach, expect } from 'vitest';

import { contains, getFixtures, getLogContent } from './utils.ts';

describe.skip('test/schedule.test.ts', () => {
  let app: MockApplication;
  afterEach(() => app.close());

  describe('schedule.registerSchedule', () => {
    it('should register succeed', async () => {
      app = mm.app({ baseDir: getFixtures('worker'), cache: false });
      await app.ready();
      const key = __filename;
      let scheduleCalled = false;
      const task = async () => {
        scheduleCalled = true;
      };
      const schedule = {
        key,
        task,
        schedule: {
          type: 'all',
          interval: 4000,
        },
      };
      (app as any).agent.schedule.registerSchedule(schedule);
      app.scheduleWorker.registerSchedule(schedule as any);

      await app.runSchedule(key);
      await sleep(1000);

      assert.equal(scheduleCalled, true);
    });

    it('should unregister succeed', async () => {
      app = mm.app({ baseDir: getFixtures('worker'), cache: false });
      await app.ready();
      const key = __filename;
      let scheduleCalled = false;
      const task = async () => {
        scheduleCalled = true;
      };
      const schedule = {
        key,
        task,
        schedule: {
          type: 'all',
          interval: 4000,
        },
      };
      (app as any).agent.schedule.registerSchedule(schedule);
      app.scheduleWorker.registerSchedule(schedule as any);

      (app as any).agent.schedule.unregisterSchedule(schedule.key);
      app.scheduleWorker.unregisterSchedule(schedule.key);

      let err: any;
      try {
        await app.runSchedule(key);
      } catch (e) {
        err = e;
      }
      assert.match(err.message, /Cannot find schedule/);
      assert.equal(scheduleCalled, false);
    });
  });

  describe('app.runSchedule', () => {
    it('should run schedule not exist throw error', async () => {
      app = mm.app({ baseDir: getFixtures('worker'), cache: false });
      await app.ready();
      try {
        await app.runSchedule(__filename);
        await sleep(1000);
        throw new Error('should not execute');
      } catch (err: any) {
        assert(err.message.includes('Cannot find schedule'));
      }
    });

    it('should run schedule by relative path success', async () => {
      app = mm.app({ baseDir: getFixtures('worker'), cache: false });
      await app.ready();
      await app.runSchedule('sub/cron');
      await sleep(1000);
      const log = getLogContent('worker');
      // console.log(log);
      assert(contains(log, 'cron') >= 1);
    });

    it('should run schedule by absolute path success', async () => {
      app = mm.app({ baseDir: getFixtures('worker'), cache: false });
      await app.ready();
      const schedulePath = getFixtures('worker/app/schedule/sub/cron.js');
      await app.runSchedule(schedulePath);
      await sleep(1000);
      const log = getLogContent('worker');
      // console.log(log);
      expect(contains(log, 'cron')).toBeGreaterThanOrEqual(1);
    });

    it('should run schedule by absolute package path success', async () => {
      app = mm.app({ baseDir: getFixtures('worker'), cache: false });
      await app.ready();
      await app.runSchedule(importResolve('egg-logrotator/app/schedule/rotate_by_file.js'));
    });

    it('should run schedule by relative path success at customDirectory', async () => {
      app = mm.app({ baseDir: getFixtures('customDirectory'), cache: false });
      await app.ready();
      await app.runSchedule('custom');
      await sleep(1000);
      const log = getLogContent('customDirectory');
      // console.log(log);
      expect(contains(log, 'customDirectory')).toBe(1);
    });

    it('should run schedule with args', async () => {
      app = mm.app({ baseDir: getFixtures('worker'), cache: false });
      await app.ready();
      await app.runSchedule('sub/cron', 'test');
      await sleep(1000);
      const log = getLogContent('worker');
      // console.log(log);
      expect(contains(log, 'cron test')).toBe(1);
    });

    it('should run schedule support ctxStorage', async () => {
      app = mm.app({ baseDir: getFixtures('worker2'), cache: false });
      await app.ready();
      app.mockContext({
        tracer: {
          traceId: 'mock-trace-123',
        },
      });
      await app.runSchedule('sub/foobar', 'use app.logger.info should work');
      await sleep(5000);
      const log = getLogContent('worker2');
      // console.log(log);
      expect(log).toMatch(/ \[-\/127.0.0.1\/mock-trace-123\/[\d.]+ms GET \/] foobar use app.logger.info should work/);
    });

    it('should run schedule with symlink js file success', async () => {
      if (!process.version.startsWith('v22.')) {
        // only work on Node.js >= v22
        return;
      }
      const realPath = getFixtures('symlink/realFile.js');
      const targetPath = getFixtures('symlink/runDir/app/schedule/realFile.js');
      try {
        fs.unlinkSync(targetPath);
      } catch {
        // ignore
      }
      try {
        fs.symlinkSync(realPath, targetPath);
      } catch {
        // ignore
      }

      app = mm.app({ baseDir: getFixtures('symlink/runDir'), cache: false });
      await app.ready();
      await app.runSchedule('realFile');
      fs.unlinkSync(targetPath);
    });
  });

  describe('export app.schedules', () => {
    it('should export app.schedules', async () => {
      app = mm.app({ baseDir: getFixtures('worker'), cache: false });
      await app.ready();
      expect(app.schedules).toBeDefined();
    });
  });
});
