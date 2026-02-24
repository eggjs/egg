import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FrameworkBaseError } from '@eggjs/errors';
import mm from 'mm';
import { describe, it, beforeEach, afterEach, afterAll } from 'vitest';

import { FileTransport, Logger, levels } from '../../src/index.ts';
import { sleep, rimraf } from '../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('test/lib/formatter.test.ts', () => {
  const tmp = path.join(__dirname, '../fixtures/tmp_formatter');
  let transport: FileTransport;
  let filepath: string;

  beforeEach(() => {
    filepath = path.join(tmp, `transport-${Date.now()}`, 'a.log');
    transport = new FileTransport({ file: filepath, level: 'INFO' });
  });
  afterEach(() => {
    transport.close();
    mm.restore();
  });
  afterAll(async () => {
    await rimraf(tmp);
  });

  it('should use util.format handle arguments', async () => {
    const logger = new Logger();
    logger.set('file', transport);
    logger.info('%s %s %j', 1, 'a', { a: 1 });
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.match(content, /1 a {"a":1}/);
    logger.close();
  });

  it('should log raw message without formatter', async () => {
    const logger = new Logger();
    logger.set('file', new FileTransport({ file: filepath, level: 'INFO' }));
    logger.write('raw message');
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.strictEqual(content, 'raw message' + os.EOL);
    logger.close();
  });

  it('should format error correctly', async () => {
    const logger = new Logger();
    logger.set(
      'file',
      new FileTransport({
        file: filepath,
        level: 'INFO',
        formatter: (meta) => `${meta.level} ${meta.pid} ${meta.message}`,
      }),
    );
    const err = new Error('test error');
    logger.error(err);
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.match(content, /ERROR \d+ nodejs.Error: test error/);
    logger.close();
  });

  it('should format FrameworkBaseError', async () => {
    const logger = new Logger();
    logger.set(
      'file',
      new FileTransport({
        file: filepath,
        level: 'INFO',
        formatter: (meta) => `${meta.level} ${meta.message}`,
      }),
    );
    class AppError extends FrameworkBaseError {
      get module(): string {
        return 'app';
      }
    }
    const err = new AppError('framework error', 1);
    logger.error(err);
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.match(content, /ERROR/);
    logger.close();
  });

  it('should output JSON log', async () => {
    const logger = new Logger();
    logger.set('file', new FileTransport({ file: filepath, level: 'INFO', json: true }));
    logger.info('json foo');
    await sleep(10);
    const line = fs.readFileSync(filepath, 'utf8').trim();
    const obj = JSON.parse(line);
    assert.strictEqual(obj.level, 'INFO');
    assert.strictEqual(obj.message, 'json foo');
    assert(obj.pid);
    assert(obj.date);
    logger.close();
  });

  it('should use custom formatter', async () => {
    const logger = new Logger();
    logger.set(
      'file',
      new FileTransport({
        file: filepath,
        level: 'INFO',
        formatter: (meta) => `[${meta.level}] ${meta.message}`,
      }),
    );
    logger.info('custom format');
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.strictEqual(content, '[INFO] custom format' + os.EOL);
    logger.close();
  });

  it('should use levels constant', () => {
    assert.strictEqual(levels.DEBUG, 0);
    assert.strictEqual(levels.INFO, 1);
    assert.strictEqual(levels.WARN, 2);
    assert.strictEqual(levels.ERROR, 3);
    assert.strictEqual(levels.NONE, Infinity);
    assert.strictEqual(levels.ALL, -Infinity);
  });
});
