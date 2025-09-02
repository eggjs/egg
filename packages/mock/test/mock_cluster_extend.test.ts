import { strict as assert } from 'node:assert';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';

import mm, { MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

describe('test/mock_cluster_extend.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.cluster({
      baseDir: getFixtures('demo'),
      coverage: false,
    });
    return app.ready();
  });
  afterAll(() => app.close());

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
