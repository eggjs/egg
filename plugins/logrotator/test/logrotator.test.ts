import util from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { scheduler } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { createUnzip } from 'node:zlib';

import { glob } from 'glob';
import { mm, type MockApplication } from '@eggjs/mock';
import moment from 'moment';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { describe, it, beforeEach, afterEach } from 'vitest';

describe('test/logrotator.test.ts', () => {
  afterEach(mm.restore);

  describe('rotate_by_day', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = mm.app({
        baseDir: 'logrotator-app',
        cache: false,
      });
      return app.ready();
    });
    afterEach(() => app.close());
    afterEach(mm.restore);

    const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_file');
    const now = moment().startOf('date');

    it('should export app.LogRotator', () => {
      assert(app.LogRotator);
    });

    it('should export agent.LogRotator', () => {
      assert(app.agent.LogRotator);
    });

    it('should throw when not implement getRotateFiles', async () => {
      const LogRotator = app.LogRotator;
      try {
        // @ts-expect-error impl by sub class
        await new LogRotator({ app }).rotate();
        throw new Error('should not throw');
      } catch (err) {
        assert(err instanceof Error);
        assert.match(err.message, /is not a function/);
      }
    });

    it('should rotate log file default', async () => {
      if (process.platform === 'win32') {
        console.warn('skip on windows');
        return;
      }
      const msg: string[] = [];
      mm(app.coreLogger, 'info', (...args: unknown[]) => {
        msg.push(util.format(...args));
      });
      await app.runSchedule(schedule);

      const files = glob.sync(path.join(app.config.logger.dir, '*.log.*'));
      assert(files.length > 4, `files.length: ${files.length}, files: ${JSON.stringify(files)}`);
      assert(
        files.some(name => name.includes('foo1.log.')),
        `should include "foo1.log.", files: ${JSON.stringify(files)}`
      );
      assert(
        files.some(name => name.includes('relative.log.')),
        `should include "relative.log.", files: ${JSON.stringify(files)}`
      );
      for (const file of files) {
        assert.match(file, /log.\d{4}-\d{2}-\d{2}$/);
      }

      const logDir = app.config.logger.dir;
      const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
      // assert.equal(fs.existsSync(path.join(logDir, `egg-web.log.${date}`)), true);
      // assert.equal(fs.existsSync(path.join(logDir, 'egg-web.log')), false);
      assert.equal(fs.existsSync(path.join(logDir, `egg-agent.log.${date}`)), true);
      // schedule will not reload logger
      assert.equal(fs.existsSync(path.join(logDir, 'egg-agent.log')), false);
      assert.equal(fs.existsSync(path.join(logDir, `logrotator-web.log.${date}`)), true);
      assert.equal(fs.existsSync(path.join(logDir, 'logrotator-web.log')), false);
      assert.equal(fs.existsSync(path.join(logDir, `common-error.log.${date}`)), true);
      assert.equal(fs.existsSync(path.join(logDir, 'common-error.log')), false);

      assert.match(msg[1], /rotate files success by DayRotator/);

      // run again should work
      await app.runSchedule(schedule);
    });

    it.skip('should error when rename to existed file', async () => {
      const file1 = path.join(app.config.logger.dir, 'foo1.log');
      const file2 = path.join(
        app.config.logger.dir,
        `foo1.log.${now.clone().subtract(1, 'days').format('YYYY-MM-DD')}`
      );
      fs.writeFileSync(file1, 'foo');
      fs.writeFileSync(file2, 'foo');
      let msg = '';
      mm(app.coreLogger, 'error', (err: Error) => {
        msg = err.message;
      });
      await app.runSchedule(schedule);
      assert(msg === `[@eggjs/logrotator] rename ${file1}, found exception: targetFile ${file2} exists!!!`);
    });

    it('should error when rename error', async () => {
      const file1 = path.join(app.config.logger.dir, 'foo1.log');
      fs.writeFileSync(file1, 'foo');
      mm(app.coreLogger, 'error', (err: Error) => {
        assert.match(err.message, /^\[@eggjs\/logrotator\] rename .*?, found exception: rename error$/);
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
      assert(
        fs.existsSync(
          path.join(app.config.logger.dir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`)
        )
      );
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
      assert(
        fs.existsSync(
          path.join(app.config.logger.dir, `foo.log.${now.clone().subtract(33, 'days').format('YYYY-MM-DD')}`)
        )
      );
    });

    it('should ignore logPath in filesRotateBySize', async () => {
      await app.runSchedule(schedule);
      const logDir = app.config.logger.dir;
      const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
      assert(fs.existsSync(path.join(logDir, `size.log.${date}`)) === false);
    });

    it('should ignore logPath in filesRotateByHour', async () => {
      await app.runSchedule(schedule);
      const logDir = app.config.logger.dir;
      const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
      assert(fs.existsSync(path.join(logDir, `hour.log.${date}`)) === false);
    });

    it('should not error when Map extend', async () => {
      // oxlint-disable-next-line typescript/no-explicit-any, no-extend-native
      (Map.prototype as any).test = () => {
        console.log('test Map extend');
      };
      await app.runSchedule(schedule);
    });
  });

  describe('rotate_by_size', () => {
    let mockfile: string;
    let app: MockApplication;
    const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_size');
    beforeEach(() => {
      app = mm.app({
        baseDir: 'logrotator-app-size',
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
      await sleep(100);
      assert(fs.existsSync(`${mockfile}.1`));
    });

    it('should keep maxFiles file only', async () => {
      fs.writeFileSync(mockfile, 'mock log text');
      // rotate first
      await app.runSchedule(schedule);
      await sleep(100);

      // files second
      fs.writeFileSync(mockfile, 'mock log text');
      await app.runSchedule(schedule);

      await sleep(100);

      // files third
      fs.writeFileSync(mockfile, 'mock log text');
      await app.runSchedule(schedule);
      await sleep(100);
      assert(fs.existsSync(`${mockfile}.1`));
      if (process.platform !== 'win32') {
        // test fail on windows
        assert(fs.existsSync(`${mockfile}.2`));
      }
      assert.equal(fs.existsSync(`${mockfile}.3`), false);
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
      assert.equal(msg, '[egg-logrotator] stat error');
    });

    it('should not great than maxFileSize', async () => {
      fs.unlinkSync(`${mockfile}.1`);
      fs.writeFileSync(mockfile, '');
      await app.runSchedule(schedule);
      assert(fs.existsSync(`${mockfile}.1`) === false);
    });
  });

  describe('reload logger', () => {
    let app: MockApplication;
    const baseDir = path.join(__dirname, 'fixtures/logger-reload');
    beforeEach(() => {
      app = mm.cluster({
        baseDir: 'logger-reload',
      });
      return app.ready();
    });
    // logging to files
    beforeEach(() => {
      return app
        .httpRequest()
        .get('/log')
        .expect({
          method: 'GET',
          path: '/log',
        })
        .expect(200);
    });
    // start rotating
    beforeEach(() => {
      return app.httpRequest().get('/rotate').expect(200);
    });

    afterEach(() => app.close());

    it('should reload worker loggers', async () => {
      await sleep(2000);

      const logname = moment().subtract(1, 'days').format('.YYYY-MM-DD');
      const logfile1 = path.join(baseDir, 'logs/logger-reload/logger-reload-web.log');
      const content1 = fs.readFileSync(logfile1, 'utf8');
      assert(content1 === '');

      const logfile2 = path.join(baseDir, `logs/logger-reload/logger-reload-web.log${logname}`);
      const content2 = fs.readFileSync(logfile2, 'utf8');
      assert(/GET \//.test(content2));

      const logfile3 = path.join(baseDir, `logs/logger-reload/egg-agent.log${logname}`);
      const content3 = fs.readFileSync(logfile3, 'utf8');
      assert(/agent warn/.test(content3));

      await app.httpRequest().get('/log').expect(200);

      // will logging to new file
      const content4 = fs.readFileSync(logfile1, 'utf8');
      assert(/GET \//.test(content4));
    });
  });

  describe('rotate_by_hour', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = mm.app({
        baseDir: 'logrotator-app-hour',
        cache: false,
      });
      return app.ready();
    });
    afterEach(() => app.close());
    afterEach(mm.restore);

    const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_hour');

    it('should rotate log file default', async () => {
      await app.runSchedule(schedule);

      const logDir = app.config.logger.dir;
      const date = moment().subtract(1, 'hours').format('YYYY-MM-DD-HH');
      assert.equal(fs.existsSync(path.join(logDir, `egg-web.log.${date}`)), true);
      assert.equal(fs.existsSync(path.join(logDir, 'egg-web.log')), false);
    });
  });

  describe('rotate_by_hour, use custom hourDelimiter', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = mm.app({
        baseDir: 'logrotator-app-hour-custom_hourdelimiter',
        cache: false,
      });
      return app.ready();
    });
    afterEach(() => app.close());
    afterEach(mm.restore);

    const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_hour');

    it('should rotate log file default', async () => {
      await app.runSchedule(schedule);

      const logDir = app.config.logger.dir;
      const date = moment().subtract(1, 'hours').format('YYYY-MM-DD_HH');
      assert.equal(fs.existsSync(path.join(logDir, `egg-web.log.${date}`)), true);
      assert.equal(fs.existsSync(path.join(logDir, 'egg-web.log')), false);
    });
  });

  describe('logrotator default', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = mm.app({
        baseDir: 'logrotator-default',
      });
      return app.ready();
    });
    afterEach(() => app.close());
    afterEach(mm.restore);

    it('should disable rotate_by_size', () => {
      const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_size.ts');
      assert(app.schedules[schedule].schedule.disable);
    });

    it('should disable rotate_by_hour', () => {
      const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_hour.ts');
      assert(app.schedules[schedule].schedule.disable);
    });
    it('should default enable rotate_by_day ', () => {
      const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_file.ts');
      assert(!app.schedules[schedule].schedule.disable);
    });
  });

  describe('rotateLogDirs not exist', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = mm.app({
        baseDir: 'noexist-rotator-dir',
        cache: false,
      });
      return app.ready();
    });
    afterEach(() => app.close());

    it('should not throw', async () => {
      const logDir = app.config.logger.dir;
      const now = moment().startOf('date');
      const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
      const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_file');
      await app.runSchedule(schedule);

      const content = fs.readFileSync(path.join(logDir, `common-error.log.${date}`), 'utf8');
      assert.equal(content, '');
    });
  });

  describe('agent logger', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = mm.app({
        baseDir: 'logrotator-agent',
        cache: false,
      });
      return app.ready();
    });
    afterEach(() => app.close());

    it('should be rotated', async () => {
      const logDir = app.config.logger.dir;
      const now = moment().startOf('date');
      const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
      const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_file');
      await app.runSchedule(schedule);

      assert(fs.existsSync(path.join(logDir, `my-agent.log.${date}`)));
    });
  });

  describe('json logger', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = mm.app({
        baseDir: 'logrotator-json-format',
        cache: false,
      });
      return app.ready();
    });
    afterEach(() => app.close());

    it('should be rotated by day', async () => {
      const logDir = app.config.logger.dir;
      const now = moment().startOf('date');
      const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
      const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_file.ts');
      await app.runSchedule(schedule);

      assert(fs.existsSync(path.join(logDir, `day.log.${date}`)));
      assert(fs.existsSync(path.join(logDir, `day.json.log.${date}`)));
    });

    it('should be rotated by hour', async () => {
      const logDir = app.config.logger.dir;
      const date = moment().subtract(1, 'hours').format('YYYY-MM-DD-HH');
      const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_hour.ts');
      await app.runSchedule(schedule);

      assert(fs.existsSync(path.join(logDir, `hour.log.${date}`)));
      assert(fs.existsSync(path.join(logDir, `hour.json.log.${date}`)));
    });

    it('should be rotated by size', async () => {
      app.getLogger('sizeLogger').info('size');
      // wait flush
      await sleep(1000);

      const logDir = app.config.logger.dir;
      const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_size.ts');
      await app.runSchedule(schedule);

      assert(fs.existsSync(path.join(logDir, 'size.log.1')));
      assert(fs.existsSync(path.join(logDir, 'size.json.log.1')));
    });
  });

  describe('rotate_by_hour_gzip', () => {
    let app: MockApplication;
    const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_hour');
    beforeEach(() => {
      app = mm.app({
        baseDir: 'logrotator-app-hour-gzip',
      });
      return app.ready();
    });
    afterEach(() => app.close());
    afterEach(mm.restore);

    it('should rotate by size and use zlib.gzip compress', async () => {
      await app.runSchedule(schedule);
      await sleep(100);
      const logDir = app.config.logger.dir;
      const date = moment().subtract(1, 'hours').format('YYYY-MM-DD-HH');
      const file = path.join(logDir, `egg-web.log.${date}.gz`);
      assert.equal(fs.existsSync(file), true);
      const gzip = createUnzip();
      fs.createReadStream(file).pipe(gzip);
      gzip.on('data', data => {
        assert(data.toString().includes('logrotator-app-hour-gzip'));
      });
      await sleep(100);
    });
  });

  describe('rotate_by_day_gzip', () => {
    let app: MockApplication;
    const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_file.ts');
    beforeEach(() => {
      app = mm.app({
        baseDir: 'logrotator-app-day-gzip',
      });
      return app.ready();
    });
    afterEach(() => app.close());
    afterEach(mm.restore);

    it('should rotate by size and use zlib.gzip compress', async () => {
      await app.runSchedule(schedule);
      await sleep(100);
      const logDir = app.config.logger.dir;
      const now = moment().startOf('date');
      const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
      const file = path.join(logDir, `egg-web.log.${date}.gz`);
      assert.equal(fs.existsSync(file), true);
      const gzip = createUnzip();
      fs.createReadStream(file).pipe(gzip);
      gzip.on('data', data => {
        assert(data.toString().includes('logrotator-app-day-gzip'));
      });
      await sleep(100);
    });
  });

  describe('rotate_by_size_gzip', () => {
    let mockfile: string;
    let app: MockApplication;
    const schedule = path.join(__dirname, '../src/app/schedule/rotate_by_size.ts');
    beforeEach(() => {
      app = mm.app({
        baseDir: 'logrotator-app-size-gzip',
      });
      return app.ready();
    });
    beforeEach(() => {
      mockfile = path.join(app.config.logger.dir, 'egg-web.log');
    });
    afterEach(() => app.close());
    afterEach(mm.restore);

    it('should rotate by size', async () => {
      await app.runSchedule(schedule);
      await sleep(100);
      const file = `${mockfile}.1.gz`;
      assert(fs.existsSync(file));
      const gzip = createUnzip();
      fs.createReadStream(file).pipe(gzip);
      gzip.on('data', data => {
        assert(data.toString().includes('logrotator-app-size-gzip'));
      });
      await sleep(100);
    });
  });
});

async function sleep(ms: number) {
  await scheduler.wait(ms);
}
