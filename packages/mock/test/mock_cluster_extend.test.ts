import { strict as assert } from 'node:assert';
import mm, { MockApplication } from '../src/index.js';

describe('test/mock_cluster_extend.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.cluster({
      baseDir: 'demo',
      coverage: false,
    });
    return app.ready();
  });
  after(() => app.close());

  afterEach(mm.restore);

  it('should mock cluster with result', async () => {
    let result = await app.mockDevice({ name: 'egg' });
    assert.deepEqual(result, { name: 'egg', mock: true });

    result = await app.mockGenerator({ name: 'egg generator' });
    assert.deepEqual(result, { name: 'egg generator', mock: true });

    result = await app.mockPromise({ name: 'egg promise' });
    assert.deepEqual(result, { name: 'egg promise', mock: true });
  });
});
