import path from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';

import { getFixtures } from './utils.ts';

describe('rotate_by_size', () => {
  let mockfile: string;
  let app: MockApplication;
  const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_size.ts');
  beforeEach(() => {
    app = mm.app({
      baseDir: getFixtures('logrotator-app-size'),
    });
    return app.ready();
  });
  beforeEach(() => {
    mockfile = path.join(app.config.logger.dir, 'egg-web.log');
  });
  afterEach(() => app.close());
  afterEach(mm.restore);

  it('should rotate by size', async () => {
    fs.writeFileSync(mockfile, 'mock log text');
    await app.runSchedule(schedule);
    await scheduler.wait(100);
    expect(fs.existsSync(`${mockfile}.1`)).toBe(true);
  });

  it('should keep maxFiles file only', async () => {
    fs.writeFileSync(mockfile, 'mock log text');
    // rotate first
    await app.runSchedule(schedule);
    await scheduler.wait(100);

    // files second
    fs.writeFileSync(mockfile, 'mock log text');
    await app.runSchedule(schedule);

    await scheduler.wait(100);

    // files third
    fs.writeFileSync(mockfile, 'mock log text');
    await app.runSchedule(schedule);
    await scheduler.wait(100);
    expect(fs.existsSync(`${mockfile}.1`)).toBe(true);
    if (process.platform !== 'win32') {
      // test fail on windows
      expect(fs.existsSync(`${mockfile}.2`)).toBe(true);
    }
    expect(fs.existsSync(`${mockfile}.3`)).toBe(false);
  });

  it.skip('should error when stat error', async () => {
    fs.writeFileSync(mockfile, 'mock log text');
    mm(fsPromises, 'stat', async () => {
      throw new Error('stat error');
    });
    let msg = '';
    mm(app.coreLogger, 'error', (err: Error) => {
      msg = err.message;
    });
    await app.runSchedule(schedule);
    expect(msg).toBe('[egg-logrotator] stat error');
  });

  it('should not great than maxFileSize', async () => {
    fs.rmSync(`${mockfile}.1`, { force: true });
    fs.writeFileSync(mockfile, '');
    await app.runSchedule(schedule);
    await app.runSchedule(schedule);
    // console.log(fs.readdirSync(path.dirname(mockfile)));
    expect(fs.existsSync(`${mockfile}.1`)).toBe(true);
  });
});
