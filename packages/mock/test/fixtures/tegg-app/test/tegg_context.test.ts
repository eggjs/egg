import { strict as assert } from 'node:assert';
import { Context } from 'egg';
// import { app, mm } from '../../../../src/bootstrap.js';
import { app, mm } from '../../../../dist/commonjs/bootstrap';
import { LogService } from '../app/modules/foo/LogService';

describe('test/tegg_context.test.ts', () => {
  let ctx: Context;
  let logService: LogService;
  before(async () => {
    logService = await app.getEggObject(LogService);
  });

  describe('mock ctx property', () => {
    it('should mock ctx work', async () => {
      ctx = await app.mockModuleContext();
      mm(ctx.tracer, 'traceId', 'mockTraceId');
      const traceId = logService.getTracerId();
      assert.strictEqual(traceId, 'mockTraceId');
    });
  });

  describe.skip('mockModuleContextWithData', () => {
    beforeEach(async () => {
      const ctx = await app.mockModuleContext({
        tracer: {
          traceId: 'mock_with_data',
        },
        headers: {
          'user-agent': 'mock_agent',
        },
      });
      assert.strictEqual(ctx.tracer.traceId, 'mock_with_data');
      assert.strictEqual(ctx.get('user-agent'), 'mock_agent');
    });

    it('should mock ctx work', () => {
      const traceId = logService.getTracerId();
      assert.strictEqual(traceId, 'mock_with_data');
    });
  });

  describe.skip('mockModuleContextWithHeaders', () => {
    beforeEach(async () => {
      await app.mockModuleContext({
        headers: {
          'user-agent': 'mock_agent',
        },
      });
    });

    it('should mock ctx work', () => {
      assert.strictEqual(app.currentContext!.get('user-agent'), 'mock_agent');
    });
  });
});
