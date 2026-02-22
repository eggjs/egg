import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import coffee from 'coffee';
import { describe, it, afterEach } from 'vitest';

import { EggLogger, levels } from '../../../src/index.ts';
import { rimraf } from '../../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loggerFile = path.join(__dirname, '../../fixtures/egg_logger.ts');
const loggerDynamicallyFile = path.join(__dirname, '../../fixtures/egg_logger_dynamically.ts');

describe('test/lib/egg/logger.test.ts', () => {
  const filepath = path.join(__dirname, '../../fixtures/tmp/a.log');

  afterEach(async () => {
    await rimraf(path.dirname(filepath));
  });

  it('should create outputJSON .json.log file', async () => {
    const options = { file: filepath, outputJSON: true, level: levels.ERROR };
    await coffee.fork(loggerFile, [JSON.stringify(options)]).end();
    assert.match(fs.readFileSync(filepath, 'utf8'), /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} ERROR \d+ error foo\n/);
    assert.match(fs.readFileSync(filepath.replace(/\.log$/, '.json.log'), 'utf8'), /"message":"error foo"/);
  });

  it('should format date with ISO format', async () => {
    const options = { file: filepath, outputJSON: true, dateISOFormat: true, level: levels.ERROR };
    await coffee.fork(loggerFile, [JSON.stringify(options)]).end();
    assert.match(fs.readFileSync(filepath, 'utf8'), /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z ERROR \d+ error foo\n/);
    assert.match(
      fs.readFileSync(filepath.replace(/\.log$/, '.json.log'), 'utf8'),
      /"date":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z"/,
    );
  });

  it('should only create outputJSON .json.log file', async () => {
    const file1 = path.join(__dirname, '../../fixtures/tmp/fileOnlyJson.log');
    const options = { file: file1, outputJSON: true, outputJSONOnly: true, level: levels.ERROR };
    await coffee.fork(loggerFile, [JSON.stringify(options)]).end();
    assert.match(fs.readFileSync(file1.replace(/\.log$/, '.json.log'), 'utf8'), /"message":"error foo"/);
    assert.strictEqual(fs.existsSync(file1), false);
  });

  it('should un-redirect specific level to logger', async () => {
    const file1 = path.join(__dirname, '../../fixtures/tmp/file1.log');
    const file2 = path.join(__dirname, '../../fixtures/tmp/file2.log');
    const logger1 = new EggLogger({ file: file1, buffer: false });
    const logger2 = new EggLogger({ file: file2, buffer: false });
    logger1.redirect('warn', logger2);
    logger1.redirect('error', logger2);
    logger1.unredirect('warn');

    logger1.warn('warn self');
    logger1.error('error logger2');
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.match(fs.readFileSync(file1, 'utf8'), /warn self/);
    assert.match(fs.readFileSync(file2, 'utf8'), /error logger2/);
    logger1.close();
    logger2.close();
  });

  it('should dynamically change level', async () => {
    const options = { file: filepath };
    await coffee.fork(loggerDynamicallyFile, [JSON.stringify(options)]).end();
    const content = fs.readFileSync(filepath, 'utf8');
    assert.match(content, /info foo\n/);
    assert.match(content, /warn foo\n/);
    assert.doesNotMatch(content, /info foo after level changed\n/);
    assert.match(content, /warn foo after level changed\n/);
  });
});
