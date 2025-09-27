import path from 'node:path';
import fs from 'node:fs';
import { scheduler } from 'node:timers/promises';
import { createUnzip } from 'node:zlib';

import { mm, type MockApplication } from '@eggjs/mock';
import moment from 'moment';
import { describe, it, beforeEach, afterEach, afterAll, beforeAll, expect } from 'vitest';

import { getFixtures } from './utils.ts';

describe('reload logger', () => {
  let app: MockApplication;
  const baseDir = getFixtures('logger-reload');
  beforeAll(() => {
    app = mm.cluster({
      baseDir: getFixtures('logger-reload'),
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

  afterAll(() => app.close());

  it('should reload worker loggers', async () => {
    await scheduler.wait(2000);

    const logname = moment().subtract(1, 'days').format('.YYYY-MM-DD');
    const logfile1 = path.join(baseDir, 'logs/logger-reload/logger-reload-web.log');
    const content1 = fs.readFileSync(logfile1, 'utf8');
    expect(content1).toBe('');

    const logfile2 = path.join(baseDir, `logs/logger-reload/logger-reload-web.log${logname}`);
    const content2 = fs.readFileSync(logfile2, 'utf8');
    expect(content2).toMatch(/GET \//);

    const logfile3 = path.join(baseDir, `logs/logger-reload/egg-agent.log${logname}`);
    const content3 = fs.readFileSync(logfile3, 'utf8');
    expect(content3).toMatch(/agent warn/);

    await app.httpRequest().get('/log').expect(200);

    // will logging to new file
    const content4 = fs.readFileSync(logfile1, 'utf8');
    expect(content4).toMatch(/GET \//);
  });
});

describe('rotate_by_hour', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('logrotator-app-hour'),
      cache: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_hour.ts');

  it('should rotate log file default', async () => {
    await app.runSchedule(schedule);

    const logDir = app.config.logger.dir;
    const date = moment().subtract(1, 'hours').format('YYYY-MM-DD-HH');
    expect(fs.existsSync(path.join(logDir, `egg-web.log.${date}`))).toBe(true);
    expect(fs.existsSync(path.join(logDir, 'egg-web.log'))).toBe(false);
  });
});

describe('rotate_by_hour, use custom hourDelimiter', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('logrotator-app-hour-custom_hourdelimiter'),
      cache: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_hour.ts');

  it('should rotate log file default', async () => {
    await app.runSchedule(schedule);

    const logDir = app.config.logger.dir;
    const date = moment().subtract(1, 'hours').format('YYYY-MM-DD_HH');
    expect(fs.existsSync(path.join(logDir, `egg-web.log.${date}`))).toBe(true);
    expect(fs.existsSync(path.join(logDir, 'egg-web.log'))).toBe(false);
  });
});

describe('logrotator default', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('logrotator-default'),
    });
    return app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  it('should disable rotate_by_size', () => {
    const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_size.ts');
    expect(app.schedules[schedule].schedule.disable).toBe(true);
  });

  it('should disable rotate_by_hour', () => {
    const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_hour.ts');
    expect(app.schedules[schedule].schedule.disable).toBe(true);
  });
  it('should default enable rotate_by_day ', () => {
    const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_file.ts');
    expect(app.schedules[schedule].schedule.disable).toBe(false);
  });
});

describe('rotateLogDirs not exist', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('noexist-rotator-dir'),
      cache: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());

  it('should not throw', async () => {
    const logDir = app.config.logger.dir;
    const now = moment().startOf('date');
    const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
    const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_file.ts');
    await app.runSchedule(schedule);

    const content = fs.readFileSync(path.join(logDir, `common-error.log.${date}`), 'utf8');
    expect(content).toBe('');
  });
});

describe('agent logger', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('logrotator-agent'),
      cache: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());

  it('should be rotated', async () => {
    const logDir = app.config.logger.dir;
    const now = moment().startOf('date');
    const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
    const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_file.ts');
    await app.runSchedule(schedule);

    expect(fs.existsSync(path.join(logDir, `my-agent.log.${date}`))).toBe(true);
  });
});

describe('json logger', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('logrotator-json-format'),
      cache: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());

  it('should be rotated by day', async () => {
    const logDir = app.config.logger.dir;
    const now = moment().startOf('date');
    const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
    const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_file.ts');
    await app.runSchedule(schedule);

    expect(fs.existsSync(path.join(logDir, `day.log.${date}`))).toBe(true);
    expect(fs.existsSync(path.join(logDir, `day.json.log.${date}`))).toBe(true);
  });

  it('should be rotated by hour', async () => {
    const logDir = app.config.logger.dir;
    const date = moment().subtract(1, 'hours').format('YYYY-MM-DD-HH');
    const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_hour.ts');
    await app.runSchedule(schedule);

    expect(fs.existsSync(path.join(logDir, `hour.log.${date}`))).toBe(true);
    expect(fs.existsSync(path.join(logDir, `hour.json.log.${date}`))).toBe(true);
  });

  it('should be rotated by size', async () => {
    app.getLogger('sizeLogger').info('size');
    // wait flush
    await scheduler.wait(1000);

    const logDir = app.config.logger.dir;
    const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_size.ts');
    await app.runSchedule(schedule);

    expect(fs.existsSync(path.join(logDir, 'size.log.1'))).toBe(true);
    expect(fs.existsSync(path.join(logDir, 'size.json.log.1'))).toBe(true);
  });
});

describe('rotate_by_hour_gzip', () => {
  let app: MockApplication;
  const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_hour.ts');
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('logrotator-app-hour-gzip'),
    });
    return app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  it('should rotate by size and use zlib.gzip compress', async () => {
    await app.runSchedule(schedule);
    await scheduler.wait(100);
    const logDir = app.config.logger.dir;
    const date = moment().subtract(1, 'hours').format('YYYY-MM-DD-HH');
    const file = path.join(logDir, `egg-web.log.${date}.gz`);
    expect(fs.existsSync(file)).toBe(true);
    const gzip = createUnzip();
    fs.createReadStream(file).pipe(gzip);
    gzip.on('data', data => {
      expect(data.toString().includes('logrotator-app-hour-gzip')).toBe(true);
    });
    await scheduler.wait(100);
  });
});

describe('rotate_by_day_gzip', () => {
  let app: MockApplication;
  const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_file.ts');
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('logrotator-app-day-gzip'),
    });
    return app.ready();
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  it('should rotate by size and use zlib.gzip compress', async () => {
    await app.runSchedule(schedule);
    await scheduler.wait(100);
    const logDir = app.config.logger.dir;
    const now = moment().startOf('date');
    const date = now.clone().subtract(1, 'days').format('YYYY-MM-DD');
    const file = path.join(logDir, `egg-web.log.${date}.gz`);
    expect(fs.existsSync(file)).toBe(true);
    const gzip = createUnzip();
    fs.createReadStream(file).pipe(gzip);
    gzip.on('data', data => {
      expect(data.toString().includes('logrotator-app-day-gzip')).toBe(true);
    });
    await scheduler.wait(100);
  });
});

describe('rotate_by_size_gzip', () => {
  let mockfile: string;
  let app: MockApplication;
  const schedule = path.join(import.meta.dirname, '../src/app/schedule/rotate_by_size.ts');
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('logrotator-app-size-gzip'),
    });
    return app.ready();
  });
  beforeEach(() => {
    mockfile = path.join(app.config.logger.dir, 'egg-web.log');
  });
  afterAll(() => app.close());
  afterEach(mm.restore);

  it('should rotate by size', async () => {
    await app.runSchedule(schedule);
    await scheduler.wait(100);
    const file = `${mockfile}.1.gz`;
    expect(fs.existsSync(file)).toBe(true);
    const gzip = createUnzip();
    fs.createReadStream(file).pipe(gzip);
    gzip.on('data', data => {
      expect(data.toString().includes('logrotator-app-size-gzip')).toBe(true);
    });
    await scheduler.wait(100);
  });
});
