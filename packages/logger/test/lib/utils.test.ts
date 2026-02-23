import assert from 'node:assert';

import { describe, it } from 'vitest';

import { formatError } from '../../src/index.ts';

describe('test/lib/utils.test.ts', () => {
  describe('formatError', () => {
    it('should format with no cause', () => {
      const rootError = new Error('root error');
      const msg = formatError(rootError);
      assert(msg.match(/nodejs\.Error: root error/));
      assert(msg.match(/pid: /));
      assert(msg.match(/hostname: /));
    });

    it('should format with cause', () => {
      const rootError = new Error('root error');
      const error = new Error('mock error', { cause: rootError });
      const msg = formatError(error);
      assert(msg.match(/nodejs\.Error: mock error/));
      assert(msg.match(/cause:/));
      assert(msg.match(/nodejs\.Error: root error/));
    });

    it('should format AggregateError', () => {
      const e1 = new Error('e1');
      const e2 = new Error('e2');
      const aggregate = new AggregateError([e1, e2], 'aggregate error');
      const msg = formatError(aggregate);
      assert(msg.match(/nodejs\.AggregateError: aggregate error/));
      assert(msg.match(/\[error-0\]:/));
      assert(msg.match(/\[error-1\]:/));
    });
  });
});
