import { strict as assert } from 'node:assert';

import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { mm } from '@eggjs/mock';

import { type MockApplication, createApp } from '../../utils.ts';

describe.skipIf(process.platform === 'win32')('test/lib/plugins/depd.test.ts', () => {
  afterEach(mm.restore);

  let app: MockApplication;
  beforeAll(() => {
    app = createApp('apps/demo');
    return app.ready();
  });
  afterAll(() => app.close());

  it('should use this.locals instead of this.state', () => {
    const ctx = app.mockContext();
    ctx.locals.test = 'aaa';
    assert.deepEqual(ctx.locals, ctx.state);
    assert.deepEqual(ctx.locals.test, ctx.state.test);
  });
});
