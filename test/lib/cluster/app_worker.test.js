'use strict';

const request = require('supertest-as-promised');
const utils = require('../../utils');

describe('test/lib/cluster/app_worker.test.js', () => {
  let app;
  before(done => {
    app = utils.cluster('apps/app-server', {
      coverage: true,
    });
    app.ready(done);
  });

  after(() => app.close());

  it('should start cluster success and app worker emit `server` event', () => {
    return request(app.callback())
    .get('/')
    .expect('true');
  });
});
