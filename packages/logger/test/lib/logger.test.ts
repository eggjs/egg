import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import iconv from 'iconv-lite';
import { describe, it, beforeEach, afterEach } from 'vitest';

import { FileTransport, FileBufferTransport, Logger } from '../../src/index.ts';
import { sleep, rimraf } from '../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('test/lib/logger.test.ts', () => {
  const tmp = path.join(__dirname, '../fixtures/tmp_logger');
  let filepath: string;

  beforeEach(async () => {
    filepath = path.join(tmp, `logger-${Date.now()}`, 'a.log');
    await rimraf(tmp);
  });
  afterEach(async () => {
    await rimraf(tmp);
  });

  it('should not print log after transport was disabled', async () => {
    const logger = new Logger();
    logger.set('file', new FileTransport({ file: filepath, level: 'INFO' }));
    logger.info('info foo');
    logger.disable('file');
    logger.info('disable foo');
    logger.enable('file');
    logger.info('enable foo');
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert(content.includes('info foo'));
    assert(!content.includes('disable foo'));
    assert(content.includes('enable foo'));
    logger.close();
  });

  it('should work with gbk encoding', async () => {
    const logger = new Logger();
    logger.set('file', new FileTransport({ file: filepath, level: 'INFO', encoding: 'gbk' }));
    logger.info('info foo 中文');
    await sleep(10);
    const content = fs.readFileSync(filepath);
    assert.strictEqual(iconv.decode(content, 'gbk'), 'info foo 中文\n');
    logger.close();
  });

  it('should flush after buffer length > maxBufferLength on FileBufferTransport', async () => {
    const logger = new Logger();
    logger.set('file', new FileBufferTransport({ file: filepath, level: 'INFO', maxBufferLength: 2 }));
    logger.info('info foo1');
    logger.info('info foo2');
    logger.info('info foo3');
    logger.info('info foo4');
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.strictEqual(content, 'info foo1\ninfo foo2\ninfo foo3\n');
    logger.close();
  });

  it('should flush gbk log after buffer length > maxBufferLength on FileBufferTransport', async () => {
    const logger = new Logger();
    logger.set('file', new FileBufferTransport({ file: filepath, level: 'INFO', maxBufferLength: 2, encoding: 'gbk' }));
    logger.info('info foo1 中文');
    logger.info('info foo2');
    logger.info('info foo3');
    logger.info('info foo4');
    await sleep(10);
    const content = fs.readFileSync(filepath);
    assert.strictEqual(iconv.decode(content, 'gbk'), 'info foo1 中文\ninfo foo2\ninfo foo3\n');
    logger.close();
  });

  it('should redirect to specify logger', async () => {
    const file1 = path.join(tmp, 'a1.log');
    const file2 = path.join(tmp, 'a2.log');
    const file3 = path.join(tmp, 'a3.log');
    const logger1 = new Logger();
    logger1.set('file', new FileTransport({ file: file1, level: 'INFO' }));
    const logger2 = new Logger();
    logger2.set('file', new FileTransport({ file: file2, level: 'INFO' }));
    const logger3 = new Logger();
    logger3.set('file', new FileTransport({ file: file3, level: 'INFO' }));
    logger1.redirect('warn', logger2);
    logger1.redirect('error', logger2);
    logger1.redirect('error', logger3); // will ignore (already redirected)
    logger1.redirect('info', logger3);
    logger1.unredirect('info');

    logger1.info('info self');
    logger1.warn('warn logger2');
    logger1.error('error logger2');

    await sleep(10);

    assert.strictEqual(fs.readFileSync(file1, 'utf8'), 'info self\n');
    assert.strictEqual(fs.readFileSync(file2, 'utf8'), 'warn logger2\nerror logger2\n');
    assert.strictEqual(fs.readFileSync(file3, 'utf8'), '');
    logger1.close();
    logger2.close();
    logger3.close();
  });

  it('should duplicate to specify logger', async () => {
    const file1 = path.join(tmp, 'a1.log');
    const file11 = path.join(tmp, 'a11.log');
    const file2 = path.join(tmp, 'a2.log');
    const file3 = path.join(tmp, 'a3.log');
    const logger1 = new Logger();
    logger1.set('file', new FileTransport({ file: file1, level: 'INFO' }));
    logger1.set('additional', new FileTransport({ file: file11, level: 'INFO' }));
    const logger2 = new Logger();
    logger2.set('file', new FileTransport({ file: file2, level: 'INFO' }));
    const logger3 = new Logger();
    logger3.set('file', new FileTransport({ file: file3, level: 'INFO' }));
    logger1.duplicate('warn', logger2);
    logger1.duplicate('error', logger2, { excludes: ['additional'] });
    logger1.duplicate('error', logger3); // will ignore
    logger1.duplicate('info', logger3);
    logger1.unduplicate('info');

    logger1.info('info self');
    logger1.warn('warn logger2');
    logger1.error('error logger2');

    await sleep(10);

    assert.strictEqual(fs.readFileSync(file1, 'utf8'), 'info self\nwarn logger2\nerror logger2\n');
    assert.strictEqual(fs.readFileSync(file11, 'utf8'), 'info self\nwarn logger2\n');
    assert.strictEqual(fs.readFileSync(file2, 'utf8'), 'warn logger2\nerror logger2\n');
    assert.strictEqual(fs.readFileSync(file3, 'utf8'), '');
    logger1.close();
    logger2.close();
    logger3.close();
  });

  it('should write raw string and ignore level', async () => {
    const logger = new Logger();
    logger.set('file', new FileTransport({ file: filepath, level: 'ERROR' }));
    logger.warn('warn');
    logger.write('none');
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.strictEqual(content, 'none\n');
    logger.close();
  });

  it('should write ignore formatter', async () => {
    const logger = new Logger();
    logger.set(
      'file',
      new FileTransport({
        file: filepath,
        level: 'INFO',
        formatter: (meta) => `${meta.pid} ${meta.message}`,
      }),
    );
    logger.info('info');
    logger.write('write');
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.match(content, /^\d* info\nwrite\n$/);
    logger.close();
  });

  it('should write default support util.format', async () => {
    const logger = new Logger();
    logger.set(
      'file',
      new FileTransport({
        file: filepath,
        level: 'INFO',
        formatter: (meta) => `${meta.pid} ${meta.message}`,
      }),
    );
    logger.write('write %j', { foo: 'bar' });
    await sleep(10);
    const content = fs.readFileSync(filepath, 'utf8');
    assert.match(content, /^write {"foo":"bar"}\n$/);
    logger.close();
  });
});
