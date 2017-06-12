'use strict';

const mm = require('egg-mock');
const assert = require('assert');
const innerClient = require('cluster-client/lib/symbol').innerClient;
const utils = require('../../utils');

describe('test/lib/cluster/cluster-client.test.js', () => {
  let app;
  before(function* () {
    mm.consoleLevel('NONE');
    app = utils.app('apps/cluster_mod_app');
    app.coverage(true);
    yield app.ready();
  });
  after(function* () {
    yield app.close();
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
});
