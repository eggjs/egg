import { strict as assert } from 'node:assert';
import { app } from '../../../../dist/commonjs/bootstrap';

describe('test/multi_mock_context.test.ts', () => {
  describe('mockContext', () => {
    it('should only reused once', async () => {
      const currentContext = app.currentContext;
      const ctx1 = app.mockContext();
      const ctx2 = app.mockContext();
      assert.strictEqual(currentContext, ctx1);
      assert.notStrictEqual(ctx2, ctx1);
    });
  });
});
