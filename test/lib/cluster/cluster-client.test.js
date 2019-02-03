'use strict';

const mm = require('egg-mock');
const assert = require('assert');
const innerClient = require('cluster-client/lib/symbol').innerClient;
const utils = require('../../utils');

let app;
describe('test/lib/cluster/cluster-client.test.js', () => {
  describe('common mode', () => {
    before(async () => {
      mm.consoleLevel('NONE');
      app = utils.app('apps/cluster_mod_app');
      await app.ready();
    });
    after(async () => {
      await app.close();
      const agentInnerClient = app.agent.registryClient[innerClient];
      assert(agentInnerClient._realClient.closed === true);
      mm.restore();
    });

    it('should publish & subscribe ok', () => {
      return app.httpRequest()
        .post('/publish')
        .send({ value: '30.20.78.299' })
        .expect('ok')
        .expect(200)
        .then(() => {
          return new Promise(resolve => {
            setTimeout(resolve, 500);
          });
        })
        .then(() => {
          return app.httpRequest()
            .get('/getHosts')
            .expect('30.20.78.299:20880')
            .expect(200);
        });
    });

    it('should get default cluster response timeout', () => {
      return app.httpRequest()
        .get('/getDefaultTimeout')
        .expect(200)
        .then(res => {
          assert(res.text === '60000');
        });
    });

    it('should get overwrite cluster response timeout', () => {
      return app.httpRequest()
        .get('/getOverwriteTimeout')
        .expect(200)
        .then(res => {
          assert(res.text === '1000');
        });
    });
  });

  describe('single process mode', () => {
    before(async () => {
      mm.consoleLevel('NONE');
      app = await utils.singleProcessApp('apps/cluster_mod_app');
    });
    after(async () => {
      await app.close();
      const agentInnerClient = app.agent.registryClient[innerClient];
      assert(agentInnerClient._realClient.closed === true);
      mm.restore();
    });

    it('should publish & subscribe ok', () => {
      return app.httpRequest()
        .post('/publish')
        .send({ value: '30.20.78.299' })
        .expect('ok')
        .expect(200)
        .then(() => {
          return new Promise(resolve => {
            setTimeout(resolve, 500);
          });
        })
        .then(() => {
          return app.httpRequest()
            .get('/getHosts')
            .expect('30.20.78.299:20880')
            .expect(200);
        });
    });

    it('should get default cluster response timeout', () => {
      return app.httpRequest()
        .get('/getDefaultTimeout')
        .expect(200)
        .then(res => {
          assert(res.text === '60000');
        });
    });

    it('should get overwrite cluster response timeout', () => {
      return app.httpRequest()
        .get('/getOverwriteTimeout')
        .expect(200)
        .then(res => {
          assert(res.text === '1000');
        });
    });
  });
});
