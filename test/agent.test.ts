import { strict as assert } from 'node:assert';
import path from 'node:path';
import { createApp, MockApplication, restore } from './utils.js';

describe('test/agent.test.ts', () => {
  afterEach(restore);
  let app: MockApplication;

  before(() => {
    app = createApp('apps/agent-logger-config');
    return app.ready();
  });
  after(() => app.close());

  it('agent logger config should work', () => {
    const fileTransport = app._agent.logger.get('file');
    assert.equal(fileTransport.options.file, path.join('/tmp/foo', 'egg-agent.log'));
  });
});
