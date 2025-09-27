import path from 'node:path';
import fs from 'node:fs';
import fsPromises, { mkdir, rm } from 'node:fs/promises';

import { glob } from 'glob';
import { mm, type MockApplication } from '@eggjs/mock';
import moment from 'moment';
import { FileTransport } from 'egg-logger';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';

import { getFixtures } from './utils.ts';

const schedule = path.join(import.meta.dirname, '../src/app/schedule/clean_log.ts');
const now = moment().startOf('date');

describe('test/clean_log.test.ts', () => {
  afterEach(mm.restore);

  let app: MockApplication;
  let logDir: string;
  beforeEach(async () => {
    app = mm.app({
      baseDir: getFixtures('clean-log'),
      cache: false,
    });
    await app.ready();
    logDir = app.config.logger.dir;
    const bizLogger = app.loggers.get('bizLogger');
    expect(bizLogger).toBeDefined();
    bizLogger!.set(
      'anotherFile',
      new FileTransport({
        file: path.join(app.config.customLogger.bizLogger.file, '..', 'another-biz.log'),
      })
    );
  });
  afterEach(() => app.close());

  it('should keep config stable', () => {
    expect(app.config.logrotator).toMatchSnapshot();
  });

  it.skipIf(process.platform === 'win32')('should clean log by maxDays', async () => {
    fs.writeFileSync(path.join(logDir, `foo.log.${now.format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(1, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(7, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(30, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(
      path.join(
        app.config.customLogger.bizLogger.file,
        '..',
        `biz.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`
      ),
      'foo'
    );
    fs.writeFileSync(
      path.join(
        app.config.customLogger.bizLogger.file,
        '..',
        `another-biz.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`
      ),
      'foo'
    );
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(32, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(50, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(6, 'months').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(
      path.join(
        app.config.customLogger.bizLogger.file,
        '..',
        `biz.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`
      ),
      'foo'
    );
    fs.writeFileSync(
      path.join(
        app.config.customLogger.bizLogger.file,
        '..',
        `another-biz.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`
      ),
      'foo'
    );

    await app.runSchedule(schedule);

    const files = glob.sync(path.join(logDir, '*.log.*'));
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(
      files.some(name => name.includes('foo.log.')),
      `files: ${JSON.stringify(files)}`
    );

    let filepath: string;
    filepath = `foo.log.${now.format('YYYY-MM-DD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(true);

    // won't clean, because maxDay is 31
    filepath = `foo.log.${now.clone().subtract(1, 'days').format('YYYY-MM-DD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(true);

    filepath = `foo.log.${now.clone().subtract(7, 'days').format('YYYY-MM-DD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(true);

    filepath = `foo.log.${now.clone().subtract(30, 'days').format('YYYY-MM-DD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(true);

    filepath = `foo.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(true);

    filepath = path.join(
      app.config.customLogger.bizLogger.file,
      '..',
      `biz.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`
    );
    expect(fs.existsSync(filepath)).toBe(true);

    filepath = path.join(
      app.config.customLogger.bizLogger.file,
      '..',
      `another-biz.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`
    );
    expect(fs.existsSync(filepath)).toBe(true);

    // clean below
    filepath = `foo.log.${now.clone().subtract(32, 'days').format('YYYY-MM-DD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(false);

    filepath = `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(false);

    filepath = `foo.log.${now.clone().subtract(50, 'days').format('YYYY-MM-DD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(false);

    filepath = `foo.log.${now.clone().subtract(6, 'months').format('YYYY-MM-DD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(false);

    filepath = `foo.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(false);

    expect(
      fs.existsSync(
        path.join(
          app.config.customLogger.bizLogger.file,
          '..',
          `biz.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`
        )
      )
    ).toBe(false);

    expect(
      fs.existsSync(
        path.join(
          app.config.customLogger.bizLogger.file,
          '..',
          `another-biz.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`
        )
      )
    ).toBe(false);
  });

  it('should not clean log with invalid date', async () => {
    // invalid date
    fs.writeFileSync(path.join(logDir, 'foo.log.0000-00-00'), 'foo');

    await app.runSchedule(schedule);

    const filepath = 'foo.log.0000-00-00';
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(true);
  });

  it('should not clean log with invalid format', async () => {
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(33, 'days').format('YYYYMMDD')}`), 'foo');

    await app.runSchedule(schedule);

    const filepath = `foo.log.${now.clone().subtract(33, 'days').format('YYYYMMDD')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(true);
  });

  it('should clean log with YYYY-MM-DD-HH', async () => {
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD-HH')}`), 'foo');

    await app.runSchedule(schedule);

    // should clean log.YYYY-MM-DD-HH
    const filepath = `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD-HH')}`;
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(false);
  });

  it('should error when readdir err', async () => {
    mm(fsPromises, 'readdir', async (dir: string) => {
      throw new Error(`Permission: readdir ${dir}`);
    });
    let message = '';
    mm(app.coreLogger, 'error', (err: Error) => (message = err.message));

    const filepath = `foo.log.${now.clone().subtract(35, 'days').format('YYYY-MM-DD')}`;
    fs.writeFileSync(path.join(logDir, filepath), 'foo');

    await app.runSchedule(schedule);

    expect(message).toMatch(/Permission: readdir/);
    // unlink error, file should exist
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(true);
  });

  it('should ignore clean when exception', async () => {
    mm(fsPromises, 'unlink', async (file: string) => {
      throw new Error(`unlink ${file} error`);
    });
    let message = '';
    mm(app.coreLogger, 'error', (err: Error) => (message = err.message));

    const filepath = `foo.log.${now.clone().subtract(34, 'days').format('YYYY-MM-DD')}`;
    fs.writeFileSync(path.join(logDir, filepath), 'foo');

    await app.runSchedule(schedule);

    expect(message).toMatch(/unlink .*?foo.log.\d{4}-\d{2}-\d{2} error$/);
    // unlink error, file should exist
    expect(fs.existsSync(path.join(logDir, filepath))).toBe(true);
  });

  it('should disable clean log when set maxDays = 0', async () => {
    mm(app.config.logrotator, 'maxDays', 0);
    fs.writeFileSync(path.join(logDir, `foo.log.${now.format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(1, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(7, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(32, 'days').format('YYYY-MM-DD')}`), 'foo');
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`), 'foo');

    await app.runSchedule(schedule);

    expect(fs.existsSync(path.join(logDir, `foo.log.${now.format('YYYY-MM-DD')}`))).toBe(true);
    expect(fs.existsSync(path.join(logDir, `foo.log.${now.clone().subtract(1, 'days').format('YYYY-MM-DD')}`))).toBe(
      true
    );
    expect(fs.existsSync(path.join(logDir, `foo.log.${now.clone().subtract(7, 'days').format('YYYY-MM-DD')}`))).toBe(
      true
    );
    expect(fs.existsSync(path.join(logDir, `foo.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`))).toBe(
      true
    );
    expect(fs.existsSync(path.join(logDir, `foo.log.${now.clone().subtract(32, 'days').format('YYYY-MM-DD')}`))).toBe(
      true
    );
    expect(fs.existsSync(path.join(logDir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`))).toBe(
      true
    );
  });

  // windows can't remove un close file, ignore it
  it.skipIf(process.platform === 'win32')('should ignore when log dir not exists', async () => {
    let message: string | undefined;
    mm(app.coreLogger, 'error', (err: Error) => (message = err.message));

    const customLoggerDir = path.join(app.config.customLogger.bizLogger.file, '..');
    const logfile = path.join(customLoggerDir, `biz.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`);
    fs.writeFileSync(logfile, 'foo');
    await rm(customLoggerDir, { recursive: true, force: true });

    await app.runSchedule(schedule);
    expect(message).toBeUndefined();
    await mkdir(customLoggerDir, { recursive: true });
  });
});
