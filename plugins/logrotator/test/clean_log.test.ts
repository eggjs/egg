import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import fsPromises, { mkdir, rm } from 'node:fs/promises';
import assert from 'node:assert/strict';

import { glob } from 'glob';
import { mm, type MockApplication } from '@eggjs/mock';
import moment from 'moment';
import { FileTransport } from 'egg-logger';
import snapshot from 'snap-shot-it';
import 'egg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schedule = path.join(__dirname, '../src/app/schedule/clean_log.ts');
const now = moment().startOf('date');

import { describe, it, beforeEach, afterEach } from 'vitest';

describe('test/clean_log.test.ts', () => {
  afterEach(mm.restore);

  let app: MockApplication;
  let logDir: string;
  beforeEach(async () => {
    app = mm.app({
      baseDir: 'clean-log',
      cache: false,
    });
    await app.ready();
    logDir = app.config.logger.dir;
    const bizLogger = app.loggers.get('bizLogger');
    assert(bizLogger);
    bizLogger.set(
      'anotherFile',
      new FileTransport({
        file: path.join(app.config.customLogger.bizLogger.file, '..', 'another-biz.log'),
      })
    );
  });
  afterEach(() => app.close());

  it('should keep config stable', () => {
    snapshot(app.config.logrotator);
  });

  it('should clean log by maxDays', async () => {
    if (process.platform === 'win32') {
      console.warn('skip on windows');
      return;
    }
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
    assert(files.length >= 5, `files.length: ${files.length}, files: ${JSON.stringify(files)}`);
    assert(
      files.some(name => name.includes('foo.log.')),
      `files: ${JSON.stringify(files)}`
    );

    let filepath: string;
    filepath = `foo.log.${now.format('YYYY-MM-DD')}`;
    assert(fs.existsSync(path.join(logDir, filepath)), `filepath: ${filepath} not exists`);

    // won't clean, because maxDay is 31
    filepath = `foo.log.${now.clone().subtract(1, 'days').format('YYYY-MM-DD')}`;
    assert(fs.existsSync(path.join(logDir, filepath)), `filepath: ${filepath} not exists`);

    filepath = `foo.log.${now.clone().subtract(7, 'days').format('YYYY-MM-DD')}`;
    assert(fs.existsSync(path.join(logDir, filepath)), `filepath: ${filepath} not exists`);

    filepath = `foo.log.${now.clone().subtract(30, 'days').format('YYYY-MM-DD')}`;
    assert(fs.existsSync(path.join(logDir, filepath)), `filepath: ${filepath} not exists`);

    filepath = `foo.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`;
    assert(fs.existsSync(path.join(logDir, filepath)), `filepath: ${filepath} not exists`);

    filepath = path.join(
      app.config.customLogger.bizLogger.file,
      '..',
      `biz.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`
    );
    assert(fs.existsSync(filepath), `filepath: ${filepath} not exists`);

    filepath = path.join(
      app.config.customLogger.bizLogger.file,
      '..',
      `another-biz.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`
    );
    assert(fs.existsSync(filepath), `filepath: ${filepath} not exists`);

    // clean below
    filepath = `foo.log.${now.clone().subtract(32, 'days').format('YYYY-MM-DD')}`;
    assert.equal(fs.existsSync(path.join(logDir, filepath)), false);

    filepath = `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`;
    assert.equal(fs.existsSync(path.join(logDir, filepath)), false);

    filepath = `foo.log.${now.clone().subtract(50, 'days').format('YYYY-MM-DD')}`;
    assert.equal(fs.existsSync(path.join(logDir, filepath)), false);

    filepath = `foo.log.${now.clone().subtract(6, 'months').format('YYYY-MM-DD')}`;
    assert.equal(fs.existsSync(path.join(logDir, filepath)), false);

    filepath = `foo.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`;
    assert.equal(fs.existsSync(path.join(logDir, filepath)), false);

    assert.equal(
      fs.existsSync(
        path.join(
          app.config.customLogger.bizLogger.file,
          '..',
          `biz.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`
        )
      ),
      false
    );

    assert.equal(
      fs.existsSync(
        path.join(
          app.config.customLogger.bizLogger.file,
          '..',
          `another-biz.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`
        )
      ),
      false
    );
  });

  it('should not clean log with invalid date', async () => {
    // invalid date
    fs.writeFileSync(path.join(logDir, 'foo.log.0000-00-00'), 'foo');

    await app.runSchedule(schedule);

    const filepath = 'foo.log.0000-00-00';
    assert.equal(fs.existsSync(path.join(logDir, filepath)), true);
  });

  it('should not clean log with invalid format', async () => {
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(33, 'days').format('YYYYMMDD')}`), 'foo');

    await app.runSchedule(schedule);

    const filepath = `foo.log.${now.clone().subtract(33, 'days').format('YYYYMMDD')}`;
    assert.equal(fs.existsSync(path.join(logDir, filepath)), true);
  });

  it('should clean log with YYYY-MM-DD-HH', async () => {
    fs.writeFileSync(path.join(logDir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD-HH')}`), 'foo');

    await app.runSchedule(schedule);

    // should clean log.YYYY-MM-DD-HH
    const filepath = `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD-HH')}`;
    assert.equal(fs.existsSync(path.join(logDir, filepath)), false);
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

    assert.match(message, /Permission: readdir/);
    // unlink error, file should exist
    assert.equal(fs.existsSync(path.join(logDir, filepath)), true);
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

    assert.match(message, /unlink .*?foo.log.\d{4}-\d{2}-\d{2} error$/);
    // unlink error, file should exist
    assert.equal(fs.existsSync(path.join(logDir, filepath)), true);
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

    assert.equal(fs.existsSync(path.join(logDir, `foo.log.${now.format('YYYY-MM-DD')}`)), true);
    assert.equal(
      fs.existsSync(path.join(logDir, `foo.log.${now.clone().subtract(1, 'days').format('YYYY-MM-DD')}`)),
      true
    );
    assert.equal(
      fs.existsSync(path.join(logDir, `foo.log.${now.clone().subtract(7, 'days').format('YYYY-MM-DD')}`)),
      true
    );
    assert.equal(
      fs.existsSync(path.join(logDir, `foo.log.${now.clone().subtract(31, 'days').format('YYYY-MM-DD')}`)),
      true
    );
    assert.equal(
      fs.existsSync(path.join(logDir, `foo.log.${now.clone().subtract(32, 'days').format('YYYY-MM-DD')}`)),
      true
    );
    assert.equal(
      fs.existsSync(path.join(logDir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`)),
      true
    );
  });

  // windows can't remove un close file, ignore it
  if (process.platform !== 'win32') {
    it('should ignore when log dir not exists', async () => {
      let message: string | undefined;
      mm(app.coreLogger, 'error', (err: Error) => (message = err.message));

      const customLoggerDir = path.join(app.config.customLogger.bizLogger.file, '..');
      const logfile = path.join(customLoggerDir, `biz.log.${now.clone().subtract(1, 'years').format('YYYY-MM-DD')}`);
      fs.writeFileSync(logfile, 'foo');
      await rm(customLoggerDir, { recursive: true, force: true });

      await app.runSchedule(schedule);
      assert(!message);
      await mkdir(customLoggerDir, { recursive: true });
    });
  }
});
