'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const mm = require('egg-mock');
const utils = require('../utils');

describe('test/lib/agent.test.js', () => {
  afterEach(mm.restore);

  describe('agent throw', () => {
    const baseDir = utils.getFilepath('apps/agent-throw');
    let app;
    before(() => {
      app = utils.cluster('apps/agent-throw');
      return app.ready();
    });
    after(() => app.close());

    it('should catch exeption', done => {
      app.httpRequest()
        .get('/agent-throw')
        .expect(200, err => {
          assert(!err);
          setTimeout(() => {
            const body = fs.readFileSync(path.join(baseDir, 'logs/agent-throw/common-error.log'), 'utf8');
            assert(body.includes('nodejs.unhandledExceptionError: agent error'));
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
            assert(body.includes('nodejs.unhandledExceptionError: agent error string'));
            done();
          }, 1000);
        });
    });
  });

  if (process.platform !== 'win32') {
    describe('require agent', () => {
      it('should exit normal', () => {
        execSync(`${process.execPath} -e "require('./lib/agent')"`, {
          timeout: 3000,
        });
      });
    });
  }
});
