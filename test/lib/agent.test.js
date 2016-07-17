'use strict';

const should = require('should');
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const execSync = require('child_process').execSync;
const mm = require('egg-mock');
const Agent = require('../../lib/agent');
const utils = require('../utils');

describe('test/lib/agent.test.js', () => {

  afterEach(mm.restore);

  describe('agent.dumpConfig()', () => {
    it('should dump config and plugins', () => {
      const baseDir = path.join(__dirname, '../fixtures/apps/demo');
      new Agent({
        baseDir,
      });
      const json = require(path.join(baseDir, 'run/agent_config.json'));
      json.plugins.onerror.version.should.match(/\d+\.\d+\.\d+/);
      json.config.name.should.equal('demo');
    });
  });

  describe('require agent', () => {
    it('should exit normal', () => {
      execSync(`${process.execPath} -e "require('./lib/agent')"`, {
        timeout: 3000,
      });
    });
  });

  describe('close()', () => {
    it('should close all listeners', function() {
      const baseDir = path.join(__dirname, '../fixtures/apps/demo');
      const agent = new Agent({
        baseDir,
      });
      process.listeners('unhandledRejection')
        .indexOf(agent._unhandledRejectionHandler).should.not.equal(-1);
      agent.close();
      process.listeners('unhandledRejection')
        .indexOf(agent._unhandledRejectionHandler).should.equal(-1);
    });

    it('should emit close event before exit', () => {
      const baseDir = path.join(__dirname, '../fixtures/apps/demo');
      const agent = new Agent({
        baseDir,
      });
      let called = false;
      agent.on('close', () => {
        called = true;
      });
      agent.close();
      called.should.equal(true);
    });
  });

  describe('agent throw', () => {
    const baseDir = utils.getFilepath('apps/agent-throw');
    let app;
    before(() => {
      mm(process.env, 'EGG_LOG', 'none');
      app = utils.cluster('apps/agent-throw');
      return app.ready();
    });

    after(() => app.close());

    it('should catch exeption', done => {
      request(app.callback())
      .get('/agent-throw')
      .expect(200, err => {
        should.not.exists(err);
        setTimeout(() => {
          const body = fs.readFileSync(path.join(baseDir, 'logs/agent-throw/common-error.log'), 'utf8');
          body.should.containEql('nodejs.unhandledExceptionError: agent error');
          app.notExpect(/nodejs.AgentWorkerDiedError/);
          done();
        }, 1000);
      });
    });
  });
});
