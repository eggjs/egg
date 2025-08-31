import { strict as assert } from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { mm } from '@eggjs/mock';
import { createApp, getFilepath, MockApplication, cluster } from './utils.js';

describe('test/agent.test.ts', () => {
  afterEach(mm.restore);

  describe('agent-logger-config', () => {
    let app: MockApplication;

    before(() => {
      app = createApp('apps/agent-logger-config');
      return app.ready();
    });
    after(() => app.close());

    it('agent logger config should work', () => {
      const fileTransport = app._agent.logger.get('file');
      assert.equal(fileTransport.options.file, path.join('/tmp/foo', 'egg-agent.log'));
    });
  });

  describe('agent throw', () => {
    const baseDir = getFilepath('apps/agent-throw');
    let app: MockApplication;
    before(() => {
      app = cluster('apps/agent-throw');
      return app.ready();
    });
    after(() => app.close());

    it('should catch unhandled exception', done => {
      app.httpRequest()
        .get('/agent-throw-async')
        .expect(200, err => {
          assert(!err);
          setTimeout(() => {
            const body = fs.readFileSync(path.join(baseDir, 'logs/agent-throw/common-error.log'), 'utf8');
            assert.match(body, /nodejs\.MessageUnhandledRejectionError: event: agent-throw-async, error: agent error in async function/);
            app.notExpect('stderr', /nodejs.AgentWorkerDiedError/);
            done();
          }, 1000);
        });
    });

    it('should exit on sync error throw', done => {
      app.httpRequest()
        .get('/agent-throw')
        .expect(200, err => {
          assert(!err);
          setTimeout(() => {
            const body = fs.readFileSync(path.join(baseDir, 'logs/agent-throw/common-error.log'), 'utf8');
            assert.match(body, /nodejs\.MessageUnhandledRejectionError: event: agent-throw, error: agent error in sync function/);
            app.notExpect('stderr', /nodejs.AgentWorkerDiedError/);
            done();
          }, 1000);
        });
    });

    it('should catch uncaughtException string error', done => {
      app.httpRequest()
        .get('/agent-throw-string')
        .expect(200, err => {
          assert(!err);
          setTimeout(() => {
            const body = fs.readFileSync(path.join(baseDir, 'logs/agent-throw/common-error.log'), 'utf8');
            assert.match(body, /nodejs\.MessageUnhandledRejectionError: event: agent-throw-string, error: agent error string/);
            app.notExpect('stderr', /nodejs.AgentWorkerDiedError/);
            done();
          }, 1000);
        });
    });
  });
});
