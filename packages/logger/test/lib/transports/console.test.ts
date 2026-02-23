import path from 'node:path';
import { fileURLToPath } from 'node:url';

import coffee from 'coffee';
import mm from 'mm';
import { describe, it, afterEach } from 'vitest';

import { levels } from '../../../src/index.ts';
import { rimraf } from '../../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loggerFile = path.join(__dirname, '../../fixtures/console_transport.ts');
const tmp = path.join(__dirname, '../../fixtures/tmp_console');

afterEach(async () => {
  await rimraf(tmp);
  mm.restore();
});

describe('test/lib/transports/console.test.ts', () => {
  it('should use EGG_LOG env for log level first', async () => {
    mm(process.env, 'EGG_LOG', 'error');
    const options = { file: path.join(tmp, 'a.log'), level: 'WARN' };
    await coffee
      .fork(loggerFile, [JSON.stringify(options)])
      .notExpect('stdout', /warn foo\r?\n/)
      .notExpect('stdout', /error foo\r?\n/)
      .expect('stderr', /error foo\r?\n/)
      .end();
  });

  it('should print warn log to stderr', async () => {
    const options = { file: path.join(tmp, 'a.log'), level: 'WARN', stderrLevel: 'WARN' };
    await coffee
      .fork(loggerFile, [JSON.stringify(options)])
      .expect('stdout', /write foo\r?\n/)
      .expect('stderr', /warn foo\r?\nerror foo\r?\n/)
      .end();
  });

  it('should not print log to stderr when stderrLevel = NONE', async () => {
    const options = { file: path.join(tmp, 'a.log'), level: 'WARN', stderrLevel: 'NONE' };
    await coffee
      .fork(loggerFile, [JSON.stringify(options)])
      .notExpect('stderr', /write foo/)
      .end();
  });

  it('should set level to levels.ERROR const', async () => {
    const options = { file: path.join(tmp, 'a.log'), level: levels.ERROR };
    await coffee
      .fork(loggerFile, [JSON.stringify(options)])
      .expect('stdout', /write foo\r?\n/)
      .expect('stderr', /error foo\r?\n/)
      .end();
  });

  it('console level should be NONE', async () => {
    const options = { file: path.join(tmp, 'a.log'), flushInterval: 10 };
    await coffee
      .fork(loggerFile, [JSON.stringify(options)])
      .expect('stdout', '')
      .expect('stderr', '')
      .end();
  });

  it('should print all log when level = debug', async () => {
    const options = { file: path.join(tmp, 'a.log'), level: 'debug', flushInterval: 10 };
    await coffee
      .fork(loggerFile, [JSON.stringify(options)])
      .expect('stdout', /debug foo\r?\n/)
      .expect('stdout', /info foo\r?\n/)
      .expect('stdout', /warn foo\r?\n/)
      .notExpect('stdout', /error foo\r?\n/)
      .expect('stderr', /error foo\r?\n/)
      .end();
  });

  it('should print error log when level = error', async () => {
    const options = { file: path.join(tmp, 'a.log'), level: 'error', flushInterval: 10 };
    await coffee
      .fork(loggerFile, [JSON.stringify(options)])
      .expect('stdout', /write foo\r?\n/)
      .expect('stderr', /error foo\r?\n/)
      .end();
  });

  it('should not print any log to stdout/stderr when level = NONE', async () => {
    const options = { file: path.join(tmp, 'a.log'), level: 'NONE', flushInterval: 10 };
    await coffee
      .fork(loggerFile, [JSON.stringify(options)])
      .expect('stdout', '')
      .expect('stderr', '')
      .end();
  });
});
