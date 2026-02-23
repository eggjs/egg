import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import iconv from 'iconv-lite';
import mm from 'mm';
import { describe, it, beforeEach, afterEach, afterAll } from 'vitest';

import { FileTransport, Logger, levels } from '../../../src/index.ts';
import { sleep, rimraf } from '../../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('test/lib/transports/file.test.ts', () => {
  const tmp = path.join(__dirname, '../../fixtures/tmp_transports_file');
  let filepath: string;

  beforeEach(() => {
    filepath = path.join(tmp, `transports_file_${Date.now()}`, 'a.log');
  });
  afterEach(() => {
    mm.restore();
  });
  afterAll(async () => {
    await rimraf(tmp);
  });

  it('should set level to levels.ERROR', async () => {
    const logger = new Logger();
    logger.set('file', new FileTransport({ file: filepath, level: 'ERROR' }));
    logger.debug('debug foo');
    logger.info('info foo');
    logger.warn('warn foo');
    logger.error('error foo');
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.doesNotMatch(content, /debug foo\r?\n/);
    assert.doesNotMatch(content, /info foo\r?\n/);
    assert.doesNotMatch(content, /warn foo\r?\n/);
    assert.match(content, /error foo\r?\n/);
    logger.close();
  });

  it('should level = info by default', async () => {
    const logger = new Logger();
    logger.set('file', new FileTransport({ file: filepath }));
    logger.debug('debug foo');
    logger.info('info foo');
    logger.warn('warn foo');
    logger.error('error foo');
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.doesNotMatch(content, /debug foo\r?\n/);
    assert.match(content, /info foo\r?\n/);
    assert.match(content, /warn foo\r?\n/);
    assert.match(content, /error foo\r?\n/);
    logger.close();
  });

  it('should support gbk encoding', async () => {
    const logger = new Logger();
    logger.set('file', new FileTransport({ file: filepath, level: 'INFO', encoding: 'gbk' }));
    logger.info('info foo 中文');
    await sleep(10);
    const content = fs.readFileSync(filepath);
    assert.strictEqual(iconv.decode(content, 'gbk'), 'info foo 中文' + os.EOL);
    logger.close();
  });

  it('should set level by number', async () => {
    const logger = new Logger();
    logger.set('file', new FileTransport({ file: filepath, level: levels.ERROR }));
    logger.info('info foo');
    logger.error('error foo');
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.doesNotMatch(content, /info foo/);
    assert.match(content, /error foo/);
    logger.close();
  });

  it('should reload stream', async () => {
    const logger = new Logger();
    logger.set('file', new FileTransport({ file: filepath, level: 'INFO' }));
    logger.info('foo1');
    await sleep(10);
    assert.strictEqual(fs.readFileSync(filepath, 'utf8'), 'foo1' + os.EOL);
    logger.reload();
    logger.info('foo2');
    await sleep(10);
    assert.strictEqual(fs.readFileSync(filepath, 'utf8'), 'foo1' + os.EOL + 'foo2' + os.EOL);
    logger.close();
  });

  it('should use formatter', async () => {
    const logger = new Logger();
    logger.set(
      'file',
      new FileTransport({
        file: filepath,
        level: 'INFO',
        formatter: (meta) => `${meta.level} ${meta.message}`,
      }),
    );
    logger.info('info foo');
    await sleep(10);
    assert.strictEqual(fs.readFileSync(filepath, 'utf8'), 'INFO info foo' + os.EOL);
    logger.close();
  });
});
