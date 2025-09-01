import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_env.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.app({
      baseDir: getFixtures('demo'),
    });
    return app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should mock env success', () => {
    assert.equal(app.config.env, 'unittest');
    assert.equal(app.config.serverEnv, undefined);
    app.mockEnv('prod');
    assert.equal(app.config.env, 'prod');
    assert.equal(app.config.serverEnv, 'prod');
  });

  it('should keep mm.restore execute in the current event loop', async () => {
    mm.restore();
    assert.equal(app.config.env, 'unittest');
    assert.equal(app.config.serverEnv, undefined);

    app.mockEnv('prod');
    assert.equal(app.config.env, 'prod');
    assert.equal(app.config.serverEnv, 'prod');

    await scheduler.wait(1);
    assert.equal(app.config.env, 'prod');
    assert.equal(app.config.serverEnv, 'prod');

    // sync restore should work
    mm.restore();
    assert.equal(app.config.env, 'unittest');
    assert.equal(app.config.serverEnv, undefined);
  });
});

