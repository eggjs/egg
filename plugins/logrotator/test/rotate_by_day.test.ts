import path from 'node:path';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';

import { glob } from 'glob';
import { mm, type MockApplication } from '@eggjs/mock';
import moment from 'moment';
import { describe, it, afterEach, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures } from './utils.ts';

describe('rotate_by_day', () => {
  let app: MockApplication;
  beforeAll(() => {
    fs.rmSync(getFixtures('logrotator-app/logs'), { force: true, recursive: true });
    app = mm.app({
      baseDir: getFixtures('logrotator-app'),
      cache: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_file.ts');
  const now = moment().startOf('date');

  it('should export app.LogRotator', () => {
    expect(app.LogRotator).toBeDefined();
  });

  it('should export agent.LogRotator', () => {
    expect(app.agent.LogRotator).toBeDefined();
  });

  it('should throw when not implement getRotateFiles', async () => {
    const LogRotator = app.LogRotator;
    try {
      // @ts-expect-error impl by sub class
      await new LogRotator({ app }).rotate();
      throw new Error('should not throw');
    } catch (err: any) {
      expect(err.message).toMatch(/is not a function/);
    }
  });

  it.skipIf(process.platform === 'win32')('should rotate log file default', async () => {
    await app.runSchedule(schedule);
    await scheduler.wait(1000);

    const files = glob.sync(path.join(app.config.logger.dir, '*.log.*'));
    expect(files.length).toBeGreaterThan(4);
    expect(files.some(name => name.includes('foo1.log.'))).toBe(true);
    expect(files.some(name => name.includes('relative.log.'))).toBe(true);
    for (const file of files) {
      expect(file).toMatch(/log.\d{4}-\d{2}-\d{2}$/);
    }

    const logDir = app.config.logger.dir;
    const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
    // expect(fs.existsSync(path.join(logDir, `egg-web.log.${date}`))).toBe(true);
    // assert.equal(fs.existsSync(path.join(logDir, 'egg-web.log')), false);
    expect(fs.existsSync(path.join(logDir, `egg-agent.log.${date}`))).toBe(true);
    // schedule will not reload logger
    // expect(fs.existsSync(path.join(logDir, 'egg-agent.log'))).toBe(false);
    // expect(fs.existsSync(path.join(logDir, `logrotator-web.log.${date}`))).toBe(true);
    // expect(fs.existsSync(path.join(logDir, 'logrotator-web.log'))).toBe(false);
    // expect(fs.existsSync(path.join(logDir, `common-error.log.${date}`))).toBe(true);
    // expect(fs.existsSync(path.join(logDir, 'common-error.log'))).toBe(false);

    const content = fs.readFileSync(path.join(logDir, `egg-web.log`), 'utf8');
    expect(content).toMatch(/rotate files success by DayRotator/);

    // run again should work
    await app.runSchedule(schedule);
  });

  it.skip('should error when rename to existed file', async () => {
    const file1 = path.join(app.config.logger.dir, 'foo1.log');
    const file2 = path.join(app.config.logger.dir, `foo1.log.${now.clone().subtract(1, 'days').format('YYYY-MM-DD')}`);
    fs.writeFileSync(file1, 'foo');
    fs.writeFileSync(file2, 'foo');
    let msg = '';
    mm(app.coreLogger, 'error', (err: Error) => {
      msg = err.message;
    });
    await app.runSchedule(schedule);
    expect(msg).toBe(`[@eggjs/logrotator] rename ${file1}, found exception: targetFile ${file2} exists!!!`);
  });

  it.skip('should error when rename error', async () => {
    const file1 = path.join(app.config.logger.dir, 'foo1.log');
    fs.writeFileSync(file1, 'foo');
    mm(app.coreLogger, 'error', (err: Error) => {
      expect(err.message).toMatch(/^\[@eggjs\/logrotator\] rename .*?, found exception: rename error$/);
    });
    mm(fsPromises, 'rename', async () => {
      throw new Error('rename error');
    });
    await app.runSchedule(schedule);
  });

  it('should mock unlink file error', async () => {
    mm(fsPromises, 'unlink', async () => {
      throw new Error('mock unlink error');
    });
    fs.writeFileSync(
      path.join(app.config.logger.dir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`),
      'foo'
    );
    await app.runSchedule(schedule);
    expect(
      fs.existsSync(
        path.join(app.config.logger.dir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`)
      )
    ).toBe(true);
  });

  it('should mock readdir error', async () => {
    mm(fsPromises, 'readdir', async () => {
      throw new Error('mock readdir error');
    });
    fs.writeFileSync(
      path.join(app.config.logger.dir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`),
      'foo'
    );
    await app.runSchedule(schedule);
    expect(
      fs.existsSync(
        path.join(app.config.logger.dir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`)
      )
    ).toBe(true);
  });

  it('should ignore logPath in filesRotateBySize', async () => {
    await app.runSchedule(schedule);
    const logDir = app.config.logger.dir;
    const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
    expect(fs.existsSync(path.join(logDir, `size.log.${date}`))).toBe(false);
  });

  it('should ignore logPath in filesRotateByHour', async () => {
    await app.runSchedule(schedule);
    const logDir = app.config.logger.dir;
    const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
    expect(fs.existsSync(path.join(logDir, `hour.log.${date}`))).toBe(false);
  });

  it('should not error when Map extend', async () => {
    // oxlint-disable-next-line typescript/no-explicit-any, no-extend-native
    (Map.prototype as any).test = () => {
      console.log('test Map extend');
    };
    await app.runSchedule(schedule);
  });
});
