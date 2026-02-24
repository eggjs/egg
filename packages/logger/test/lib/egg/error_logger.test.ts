import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import coffee from 'coffee';
import { describe, it, afterEach } from 'vitest';

import { EggErrorLogger, defaultFormatter } from '../../../src/index.ts';
import { rimraf } from '../../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const errorLoggerFile = path.join(__dirname, '../../fixtures/egg_error_logger.ts');

// coffee.fork() can't execute .ts files on Windows Node 20 (no native TypeScript support)
describe.skipIf(process.platform === 'win32' && process.version.startsWith('v20.'))(
  'test/lib/egg/error_logger.test.ts',
  () => {
    const filepath = path.join(__dirname, '../../fixtures/tmp/a.log');

    afterEach(async () => {
      await rimraf(path.dirname(filepath));
    });

    it('default params', () => {
      const logger = new EggErrorLogger({ file: filepath });
      assert.strictEqual(logger.opts.level, 'ERROR');
      assert.strictEqual(logger.opts.consoleLevel, 'ERROR');
      assert.strictEqual(logger.opts.formatter, defaultFormatter);
    });

    it('should log error level only', async () => {
      const options = { file: filepath, flushInterval: 10 };
      await coffee
        .fork(errorLoggerFile, [JSON.stringify(options)])
        .expect('stdout', '')
        .expect('stderr', /ERROR \d+ error foo/)
        .end();
      const content = fs.readFileSync(filepath, 'utf8');
      assert.doesNotMatch(content, /WARN \d+ warn foo/);
      assert.match(content, /ERROR \d+ error foo/);
    });

    it("can't set level below ERROR", async () => {
      const options = { file: filepath, level: 'WARN', consoleLevel: 'WARN' };
      await coffee
        .fork(errorLoggerFile, [JSON.stringify(options)])
        .expect('stdout', '')
        .expect('stderr', /ERROR \d+ error foo/)
        .end();
      const content = fs.readFileSync(filepath, 'utf8');
      assert.doesNotMatch(content, /WARN \d+ warn foo/);
      assert.match(content, /ERROR \d+ error foo/);
    });

    it('can set NONE level', async () => {
      const options = { file: filepath, level: 'NONE', consoleLevel: 'NONE' };
      await coffee
        .fork(errorLoggerFile, [JSON.stringify(options)])
        .expect('stdout', '')
        .expect('stderr', '')
        .end();
      assert.strictEqual(fs.readFileSync(filepath, 'utf8'), '');
    });
  },
);
