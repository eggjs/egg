'use strict';

const assert = require('assert');
const mm = require('egg-mock');
const fs = require('fs');
const request = require('supertest');
const sleep = require('mz-modules/sleep');
const utils = require('../../utils');
const file_path1 = utils.getFilepath('apps/watcher-development-app/tmp.txt');
const file_path2 = utils.getFilepath('apps/watcher-development-app/tmp/tmp.txt');
const file_path1_agent = utils.getFilepath('apps/watcher-development-app/tmp-agent.txt');

describe('test/lib/plugins/watcher.test.js', () => {

  describe('default', () => {
    let app;
    beforeEach(() => {
      app = utils.cluster('apps/watcher-development-app');
      app.coverage(false);
      return app.ready();
    });

    afterEach(() => app.close());
    afterEach(mm.restore);

    it('should app watcher work', function* () {
      const server = app.callback();
      let count = 0;

      yield request(server)
      .get('/app-watch')
      .expect(200)
      .expect('app watch success');

      yield sleep(3000);
      fs.writeFileSync(file_path1, 'aaa');
      yield sleep(3000);

      yield request(server)
      .get('/app-msg')
      .expect(200)
      .expect(function(res) {
        const lastCount = count;
        count = parseInt(res.text);
        assert(count > lastCount);
      });

      fs.writeFileSync(file_path2, 'aaa');
      yield sleep(3000);

      yield request(server)
      .get('/app-msg')
      .expect(200)
      .expect(function(res) {
        const lastCount = count;
        count = parseInt(res.text);
        assert(count > lastCount);
      });
    });

    it('should agent watcher work', function* () {
      let count = 0;
      yield request(app.callback())
      .get('/agent-watch')
      .expect(200)
      .expect('agent watch success');

      fs.writeFileSync(file_path1_agent, 'bbb');
      yield sleep(3000);

      yield request(app.callback())
      .get('/agent-msg')
      .expect(200)
      .expect(res => {
        const lastCount = count;
        count = parseInt(res.text);
        count.should.greaterThan(lastCount);
      });
    });

  });

  describe('config.watcher.type is default', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/watcher-type-default');
      app.coverage(false);
      return app.ready();
    });

    after(() => app.close());

    it('should warn user', function* () {
      yield sleep(3000);
      const logPath = utils.getFilepath('apps/watcher-type-default/logs/watcher-type-default/egg-agent.log');
      const content = fs.readFileSync(logPath, 'utf8');
      assert(content.includes('defaultEventSource watcher will NOT take effect'));
    });
  });
});
