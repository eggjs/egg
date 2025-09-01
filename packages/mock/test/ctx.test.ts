import path from 'node:path';
import { strict as assert } from 'node:assert';
import { getFixtures } from './helper.js';
import mm, { MockApplication } from '../src/index.js';

const fixtures = getFixtures('');

describe('test/ctx.test.ts', () => {
  afterEach(mm.restore);

  let app: MockApplication;
  before(done => {
    app = mm.app({
      baseDir: path.join(fixtures, 'demo'),
    });
    app.ready(done);
  });
  after(() => app.close());

  it('should has logger, app, request', () => {
    const ctx = app.mockContext();
    assert(ctx.app instanceof Object);
    assert(ctx.logger instanceof Object);
    assert(ctx.coreLogger instanceof Object);
    assert(ctx.request.url === '/');
    assert(ctx.request.ip === '127.0.0.1');
  });

  it('should ctx.ip work', () => {
    const ctx = app.mockContext();
    ctx.request.headers['x-forwarded-for'] = '';
    assert.equal(ctx.request.ip, '127.0.0.1');
  });

  it('should has services', async () => {
    const ctx = app.mockContext();
    const data = await ctx.service.foo.get('foo');
    assert.equal(data, 'bar');
  });

  it('should not override mockData', async () => {
    const mockData: any = { user: 'popomore' };
    app.mockContext(mockData);
    app.mockContext(mockData);
    assert(!mockData.headers);
    assert(!mockData.method);
  });

  describe('mockContextScope', () => {
    it('should not conflict with nest call', async () => {
      await app.mockContextScope(async (ctx: any) => {
        const currentStore = app.ctxStorage.getStore();
        assert(ctx === currentStore);

        await app.mockContextScope(async (nestCtx: any) => {
          const currentStore = app.ctxStorage.getStore();
          assert(nestCtx === currentStore);
        });
      });

      await app.mockContextScope(async () => {
        const ctx = app.ctxStorage.getStore();
        await app.mockContextScope(async (newCtx: any) => {
          const currentStore = app.ctxStorage.getStore();
          assert.equal(newCtx, currentStore);
          assert.notEqual(ctx, currentStore);
        });
      });
    });

    it('should not conflict with concurrent call', async () => {
      await Promise.all([
        await app.mockContextScope(async (ctx: any) => {
          const currentStore = app.ctxStorage.getStore();
          assert(ctx === currentStore);
        }),
        await app.mockContextScope(async (ctx: any) => {
          const currentStore = app.ctxStorage.getStore();
          assert(ctx === currentStore);
        }),
      ]);
    });
  });
});
