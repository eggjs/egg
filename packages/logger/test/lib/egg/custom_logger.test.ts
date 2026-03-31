import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import coffee from 'coffee';
import { describe, it, beforeEach, afterEach } from 'vitest';

import { rimraf } from '../../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loggerFile = path.join(__dirname, '../../fixtures/egg_custom_logger.ts');
const tmpDir = path.join(__dirname, '../../fixtures/tmp_custom_logger');
const filePath = path.join(tmpDir, 'a.log');

beforeEach(() => rimraf(tmpDir));
afterEach(() => rimraf(tmpDir));

describe('test/lib/egg/custom_logger.test.ts', () => {
  it('should format work', async () => {
    const options = { file: filePath, level: 'WARN' };
    await coffee.fork(loggerFile, [JSON.stringify(options)]).end();
    const log = await readFile(filePath, 'utf-8');
    assert.match(log, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} ERROR \d+ error foo\r?\n/);
  });

  it('should support relative path', async () => {
    const options = { dir: tmpDir, file: 'relative.log', level: 'WARN' };
    await coffee.fork(loggerFile, [JSON.stringify(options)]).end();
    const log = await readFile(path.join(tmpDir, options.file), 'utf-8');
    assert.match(log, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} ERROR \d+ error foo\r?\n/);
  });
});
