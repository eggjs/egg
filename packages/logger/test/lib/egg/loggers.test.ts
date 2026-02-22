import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import coffee from 'coffee';
import { describe, it, beforeAll, afterAll } from 'vitest';

import { EggLoggers } from '../../../src/index.ts';
import { sleep, rimraf } from '../../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const eggLoggersFile = path.join(__dirname, '../../fixtures/egg_loggers.ts');
const eggLoggersConsoleDuplicateFile = path.join(__dirname, '../../fixtures/egg_loggers_console_duplicate.ts');

describe('test/lib/egg/loggers.test.ts', () => {
  const tmp = path.join(__dirname, '../../fixtures/tmp_egg_loggers');

  beforeAll(() => rimraf(tmp));
  afterAll(() => rimraf(tmp));

  describe('application', () => {
    let loggers: EggLoggers;

    beforeAll(() => {
      loggers = new EggLoggers({
        logger: {
          type: 'application',
          dir: tmp,
          appLogName: 'app-web.log',
          coreLogName: 'egg-web.log',
          agentLogName: 'egg-agent.log',
          errorLogName: 'common-error.log',
          buffer: false,
          coreLogger: {
            level: 'WARN',
            consoleLevel: 'WARN',
          },
        },
      });
    });

    afterAll(() => loggers.reload());

    it('loggers can create multi logger instance', () => {
      assert(loggers.logger);
      assert(loggers.coreLogger);
      assert(loggers.errorLogger);
    });

    it('app.logger log to appLogName', async () => {
      (loggers.logger as unknown as { info: (s: string) => void }).info('logger info foo');
      await sleep(10);
      const content = fs.readFileSync(path.join(tmp, 'app-web.log'), 'utf8');
      assert.match(content, / INFO \d+ logger info foo/);
    });

    it('app.coreLogger log to coreLogName', async () => {
      (loggers.coreLogger as unknown as { warn: (s: string) => void }).warn('coreLogger warn foo');
      await sleep(10);
      const content = fs.readFileSync(path.join(tmp, 'egg-web.log'), 'utf8');
      assert.match(content, / WARN \d+ coreLogger warn foo/);
    });

    it('error logger to common-error.log', async () => {
      (loggers.logger as unknown as { error: (s: string) => void }).error('error log');
      await sleep(10);
      const content = fs.readFileSync(path.join(tmp, 'common-error.log'), 'utf8');
      assert.match(content, / ERROR \d+ error log/);
    });
  });

  describe('disable console', () => {
    it('should disable console output', async () => {
      await coffee
        .fork(eggLoggersFile)
        .expect('stdout', /info foo/)
        .notExpect('stdout', /info foo after disable/)
        .end();
    });
  });

  describe('console duplicate', () => {
    it('should not duplicate console for custom logger error', async () => {
      await coffee
        .fork(eggLoggersConsoleDuplicateFile)
        .expect('stderr', /built-in error/)
        .expect('stdout', /custom info/)
        .expect('stderr', /custom error/)
        .end();
    });
  });
});
