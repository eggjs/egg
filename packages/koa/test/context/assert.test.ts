import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import context from '../test-helpers/context.ts';

describe('ctx.assert(value, status)', () => {
  it('should throw an error', () => {
    const ctx = context();

    assert.throws(
      () => {
        ctx.assert(false, 404);
      },
      {
        message: 'Not Found',
        status: 404,
        expose: true,
      }
    );

    assert.throws(
      () => {
        ctx.assert(false, 401, 'Please login!');
      },
      {
        message: 'Please login!',
        status: 401,
        expose: true,
      }
    );
  });

  it('should throw an error with error message', () => {
    const ctx = context();

    assert.throws(
      () => {
        ctx.assert(false, 404, 'Not Found');
      },
      {
        message: 'Not Found',
        status: 404,
        expose: true,
      }
    );
  });

  it('should throw an error with error message and error props', () => {
    const ctx = context();

    assert.throws(
      () => {
        ctx.assert(false, 404, 'Not Found', { foo: 'bar' });
      },
      {
        message: 'Not Found',
        status: 404,
        expose: true,
        foo: 'bar',
      }
    );
  });

  it('should throw an error with error props', () => {
    const ctx = context();

    assert.throws(
      () => {
        ctx.assert(false, 500, { foo: 'bar' });
      },
      {
        message: 'Internal Server Error',
        status: 500,
        expose: false,
        foo: 'bar',
      }
    );

    assert.throws(
      () => {
        ctx.assert(false, 500, {
          foo: 'bar',
          message: 'Internal Server Error custom message',
        });
      },
      {
        message: 'Internal Server Error custom message',
        status: 500,
        expose: false,
        foo: 'bar',
      }
    );
  });

  it('should throw an error with default status', () => {
    const ctx = context();

    assert.throws(
      () => {
        ctx.assert(false);
      },
      {
        message: 'Internal Server Error',
        status: 500,
        expose: false,
      }
    );
  });
});
