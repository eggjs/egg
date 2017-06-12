'use strict';

const utils = require('../../utils');

describe('test/lib/cluster/app_worker.test.js', () => {
  let app;
  before(() => {
    app = utils.cluster('apps/app-server');
    app.coverage(true);
    return app.ready();
  });
  after(() => app.close());

  it('should start cluster success and app worker emit `server` event', () => {
    return app.httpRequest()
    .get('/')
    .expect('true');
  });
});
