import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mm from 'mm';
import { describe, it, beforeEach, afterEach, afterAll } from 'vitest';

import { FileBufferTransport, Logger } from '../../../src/index.ts';
import { sleep, rimraf } from '../../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('test/lib/transports/file_buffer.test.ts', () => {
  const tmp = path.join(__dirname, '../../fixtures/tmp_file_buffer');
  let filepath: string;

  beforeEach(() => {
    filepath = path.join(tmp, `transports_file_buffer_${Date.now()}`, 'a.log');
  });
  afterEach(() => {
    mm.restore();
  });
  afterAll(async () => {
    await rimraf(tmp);
  });

  it('should write to file after flushInterval hit', async () => {
    const logger = new Logger();
    const transport = new FileBufferTransport({ file: filepath, level: 'INFO' });
    logger.set('file', transport);
    logger.info('info foo');

    await sleep(100);
    assert.strictEqual(transport._buf.length > 0, true);
    assert.strictEqual(fs.readFileSync(filepath, 'utf8'), '');

    await sleep(1000);
    assert.strictEqual(fs.readFileSync(filepath, 'utf8'), 'info foo\n');
    logger.close();
  });

  it('should close timer after transport end', () => {
    const transport = new FileBufferTransport({ file: filepath, level: 'INFO' });
    transport.end();
    assert.strictEqual(transport._timer, null);
  });

  it('should flush on close', async () => {
    const logger = new Logger();
    const transport = new FileBufferTransport({ file: filepath, level: 'INFO' });
    logger.set('file', transport);
    logger.info('foo1');
    logger.info('foo2');
    logger.close();
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.strictEqual(content, 'foo1\nfoo2\n');
  });

  it('should flush when maxBufferLength exceeded', async () => {
    const logger = new Logger();
    logger.set('file', new FileBufferTransport({ file: filepath, level: 'INFO', maxBufferLength: 2 }));
    logger.info('foo1');
    logger.info('foo2');
    logger.info('foo3');
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.strictEqual(content, 'foo1\nfoo2\nfoo3\n');
    logger.close();
  });
});
