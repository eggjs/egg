'use strict';

const fs = require('fs');
const mm = require('egg-mock');
const sleep = require('co-sleep');
const utils = require('../../utils');

describe('test/app/extend/agent.test.js', () => {
  afterEach(mm.restore);

  describe('agent.addSingleton()', () => {
    let app;
    before(done => {
      app = utils.app('apps/singleton-demo');
      app.ready(done);
    });
    after(() => app.close());

    it('should add singleton success', function* () {
      let config = yield app.agent.dataService.get('second').getConfig();
      config.foo.should.equal('bar');
      config.foo2.should.equal('bar2');

      const ds = yield app.agent.dataService.createInstance({ foo: 'barrr' });
      config = yield ds.getConfig();
      config.foo.should.equal('barrr');
    });
  });

  describe('agent.instrument()', () => {
    it.skip('should not log in unittest env', function* () {
      mm.env('unittest');
      const app = utils.app('apps/agent-instrument');
      yield app.ready();
      yield sleep(1000);
      // TODO: why egg-agent.log not exists?
      const log = fs.readFileSync(
        utils.getFilepath('apps/agent-instrument/logs/agent-instrument/egg-agent.log'), 'utf8');
      log.should.not.match(/\[http\] \/hello/);
      app.close();
    });

    it('should log in local env', function* () {
      mm.env('local');
      const app = utils.app('apps/agent-instrument', { cache: false });
      yield app.ready();
      yield sleep(1000);
      const log = fs.readFileSync(
        utils.getFilepath('apps/agent-instrument/logs/agent-instrument/egg-agent.log'), 'utf8');
      log.should.match(/\[http\] \/hello/);
      app.close();
    });
  });
});
