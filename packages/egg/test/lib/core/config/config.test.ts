import { strict as assert } from 'node:assert';
import { MockApplication, createApp } from '../../../utils.js';

describe('test/lib/core/config/config.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = createApp('apps/demo');
    return app.ready();
  });
  after(() => app.close());

  it('should return config.name', () => {
    assert.equal(app.config.name, 'demo');
    assert.equal(app.config.logger.disableConsoleAfterReady, false);
  });
});
