const assert = require('node:assert');
const mm = require('egg-mock');
const FetchFactory = require('../../../lib/core/fetch_factory');
const utils = require('../../utils');

describe('test/lib/core/fetch_factory.test.js', () => {
  if (!FetchFactory) return;
  let url;

  before(async () => {
    url = await utils.startLocalServer();
  });

  afterEach(mm.restore);

  it('should fetch ok', async () => {
    const { status } = await FetchFactory.fetch(url);
    assert(status === 200);
  });
});
