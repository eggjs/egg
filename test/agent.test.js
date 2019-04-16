'use strict';

const assert = require('assert');
const mock = require('egg-mock');
const path = require('path');
const utils = require('./utils');

describe('test/agent.test.js', () => {
  afterEach(mock.restore);
  let app;

  before(() => {
    app = utils.app('apps/agent-logger-config');
    return app.ready();
  });
  after(() => app.close());

  it('agent logger config should work', () => {
    const fileTransport = app._agent.logger.get('file');
    assert(fileTransport.options.file === path.join('/tmp/foo', 'egg-agent.log'));
  });
});
