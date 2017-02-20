'use strict';

const utils = require('../../utils');

describe.only('test/lib/cluster/cluster-client-error.test.js', () => {
  let app;
  before(function* () {
    app = utils.app('apps/cluster-client-error');
    yield app.ready();
  });
  after(() => app.close());

  it('should ok', () => {
  });

});
