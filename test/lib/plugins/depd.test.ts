import { strict as assert } from 'node:assert';
import { mm } from '@eggjs/mock';
import { MockApplication, createApp } from '../../utils.js';

describe('test/lib/plugins/depd.test.ts', () => {
  afterEach(mm.restore);

  let app: MockApplication;
  before(() => {
    app = createApp('apps/demo');
    return app.ready();
  });
  after(() => app.close());

  it('should use this.locals instead of this.state', () => {
    const ctx = app.mockContext();
    ctx.locals.test = 'aaa';
    assert.deepEqual(ctx.locals, ctx.state);
    assert.deepEqual(ctx.locals.test, ctx.state.test);
  });
});
