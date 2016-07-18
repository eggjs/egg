'use strict';

const fs = require('fs');
const path = require('path');
const should = require('should');
const rimraf = require('rimraf');
const mm = require('egg-mock');
const glob = require('glob');
const utils = require('../../utils');
const Agent = require('../../..').Agent;

const fixtures = path.join(__dirname, '../../fixtures');

describe.skip('test/lib/cluster/agent_worker.test.js', () => {

  afterEach(mm.restore);

  describe('agent custom loggers', () => {
    let agent;

    before(() => {
      rimraf.sync(path.join(fixtures, 'apps/custom-logger/logs'));
      agent = new Agent({
        baseDir: path.join(fixtures, 'apps/custom-logger'),
      });
    });

    it('should support custom logger in agent', done => {
      should.exist(agent.loggers);
      should.exist(agent.loggers.myLogger);

      agent.loggers.myLogger.info('hello my logger!');

      setTimeout(() => {
        fs.readFileSync(path.join(fixtures, 'apps/custom-logger/logs/my.log'), 'utf8')
          .should.equal('hello my logger!\n');
        done();
      }, 1500);
    });

    it('should reload log in agent', done => {
      rimraf.sync(path.join(fixtures, 'apps/custom-logger/logs/my.log'));

      process.emit('message', {
        action: 'test-reload-logger',
      });

      setTimeout(() => {
        agent.loggers.myLogger.info('goodbye my logger!');

        setTimeout(() => {
          fs.readFileSync(path.join(fixtures, 'apps/custom-logger/logs/my.log'), 'utf8')
            .should.equal('goodbye my logger!\n');
          done();
        }, 1500);
      }, 200);
    });
  });

  describe('logrotater', () => {
    let app;
    before(done => {
      mm(process.env, 'EGG_LOG', 'NONE');
      app = utils.cluster('apps/app-monitor');
      app.ready(done);
    });

    after(() => app.close());

    it('should cut the log file', done => {
      const baseDir = utils.getFilepath('apps/app-monitor');
      this.app.process.send({
        to: 'agent',
        action: 'test-reload-logger',
      });
      setTimeout(() => {
        const files = glob.sync(path.join(baseDir, 'logs/app-monitor/*.log.*'));
        files.length.should.above(0);
        files.forEach(file => {
          file.should.match(/log.\d{4}-\d{2}-\d{2}$/);
        });
        done();
      }, 1000);
    });
  });
});
