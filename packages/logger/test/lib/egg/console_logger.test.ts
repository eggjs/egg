import path from 'node:path';
import { fileURLToPath } from 'node:url';

import coffee from 'coffee';
import mm from 'mm';
import { describe, it, afterEach } from 'vitest';

import { rimraf } from '../../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const consoleLoggerFile = path.join(__dirname, '../../fixtures/egg_console_logger.ts');
const tmp = path.join(__dirname, '../../fixtures/tmp_console_logger');

afterEach(async () => {
  await rimraf(tmp);
  mm.restore();
});

describe('test/lib/egg/console_logger.test.ts', () => {
  it('should info by default on EGG_SERVER_ENV = prod', async () => {
    mm(process.env, 'EGG_SERVER_ENV', 'prod');
    await coffee
      .fork(consoleLoggerFile)
      .notExpect('stdout', /DEBUG \d+ debug foo/)
      .expect('stdout', /INFO \d+ info foo/)
      .expect('stdout', /WARN \d+ warn foo/)
      .expect('stderr', /ERROR \d+ error foo/)
      .end();
  });

  it('should warn by default when EGG_SERVER_ENV is not prod', async () => {
    mm(process.env, 'EGG_SERVER_ENV', '');
    await coffee
      .fork(consoleLoggerFile)
      .notExpect('stdout', /DEBUG \d+ debug foo/)
      .notExpect('stdout', /INFO \d+ info foo/)
      .expect('stdout', /WARN \d+ warn foo/)
      .expect('stderr', /ERROR \d+ error foo/)
      .end();
  });

  it('should show console log with date/level/pid', async () => {
    await coffee
      .fork(consoleLoggerFile)
      .expect('stderr', /[\d ,:.-]+ ERROR \d+ error foo/)
      .end();
  });

  it('should use NODE_CONSOLE_LOGGER_LEVEL env', async () => {
    mm(process.env, 'NODE_CONSOLE_LOGGER_LEVEL', 'INFO');
    await coffee
      .fork(consoleLoggerFile)
      .expect('stdout', /INFO \d+ info foo/)
      .end();
  });
});
