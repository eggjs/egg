'use strict';

const mm = require('egg-mock');
const utils = require('../../utils');
const request = require('supertest');

describe('test/lib/cluster/cluster-client.test.js', () => {
  let app;
  before(function* () {
    mm.consoleLevel('NONE');
    app = utils.cluster('apps/cluster_mod_app', { coverage: true });
    yield app.ready();
  });

  it('should publish & subscribe ok', () => {
    return request(app.callback())
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
        return request(app.callback())
          .get('/getHosts')
          .expect('30.20.78.299:20880')
          .expect(200);
      });
  });

  after(() => {
    app.close();
    mm.restore();
  });
});
