'use strict';

const request = require('supertest');
const address = require('address');
const assert = require('assert');
const utils = require('../../utils');

describe('test/lib/cluster/app_worker.test.js', () => {
  let app;
  before(() => {
    app = utils.cluster('apps/app-server');
    return app.ready();
  });
  after(() => app.close());

  it('should start cluster success and app worker emit `server` event', () => {
    return app.httpRequest()
      .get('/')
      .expect('true');
  });

  describe('listen hostname', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/app-server-with-hostname');
      return app.ready();
    });
    after(() => app.close());

    it('should refuse other ip', async () => {
      const url = address.ip() + ':' + app.port;

      await request(url)
        .get('/')
        .expect('done')
        .expect(200);

      try {
        await request('http://127.0.0.1:17010')
          .get('/')
          .expect('done')
          .expect(200);
        throw new Error('should not run');
      } catch (err) {
        assert(err.message === 'ECONNREFUSED: Connection refused');
      }
    });
  });
});
