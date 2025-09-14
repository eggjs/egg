import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { scheduler } from 'node:timers/promises';

import { describe, it, afterEach, beforeAll, afterAll } from 'vitest';
import { mm } from '@eggjs/mock';

import {
  createApp,
  getFilepath,
  type MockApplication,
  cluster,
} from './utils.ts';

describe('test/agent.test.ts', () => {
  afterEach(mm.restore);

  describe('agent-logger-config', () => {
    let app: MockApplication;

    beforeAll(async () => {
      app = createApp('apps/agent-logger-config');
      return await app.ready();
    });
    afterAll(() => app.close());

    it('agent logger config should work', () => {
      const fileTransport = app._agent.logger.get('file');
      assert.equal(
        fileTransport.options.file,
        path.join('/tmp/foo', 'egg-agent.log')
      );
    });
  });

  describe('agent throw', () => {
    const baseDir = getFilepath('apps/agent-throw');
    let app: MockApplication;
    beforeAll(async () => {
      app = cluster('apps/agent-throw');
      await app.ready();
    });
    afterAll(() => app.close());

    it('should catch unhandled exception', async () => {
      await app.httpRequest().get('/agent-throw-async').expect(200);
      await scheduler.wait(1000);
      const body = fs.readFileSync(
        path.join(baseDir, 'logs/agent-throw/common-error.log'),
        'utf8'
      );
      assert.match(
        body,
        /nodejs\.MessageUnhandledRejectionError: event: agent-throw-async, error: agent error in async function/
      );
      app.notExpect('stderr', /nodejs.AgentWorkerDiedError/);
    });

    it('should exit on sync error throw', async () => {
      await app.httpRequest().get('/agent-throw').expect(200);
      await scheduler.wait(1000);
      const body = fs.readFileSync(
        path.join(baseDir, 'logs/agent-throw/common-error.log'),
        'utf8'
      );
      assert.match(
        body,
        /nodejs\.MessageUnhandledRejectionError: event: agent-throw, error: agent error in sync function/
      );
      app.notExpect('stderr', /nodejs.AgentWorkerDiedError/);
    });

    it('should catch uncaughtException string error', async () => {
      await app.httpRequest().get('/agent-throw-string').expect(200);
      await scheduler.wait(1000);
      const body = fs.readFileSync(
        path.join(baseDir, 'logs/agent-throw/common-error.log'),
        'utf8'
      );
      assert.match(
        body,
        /nodejs\.MessageUnhandledRejectionError: event: agent-throw-string, error: agent error string/
      );
      app.notExpect('stderr', /nodejs.AgentWorkerDiedError/);
    });
  });
});
