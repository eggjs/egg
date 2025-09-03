import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { runInNewContext } from 'node:vm';

import { mm } from 'mm';

import Koa from '../../src/index.ts';

describe('app.onerror(err)', () => {
  afterEach(mm.restore);

  it('should throw an error if a non-error is given', () => {
    const app = new Koa();

    assert.throws(
      () => {
        // @ts-expect-error protected method
        // oxlint-disable-next-line @typescript-eslint/no-explicit-any
        app.onerror('foo' as any);
      },
      TypeError,
      'non-error thrown: foo'
    );
  });

  it('should accept errors coming from other scopes', () => {
    const app = new Koa();
    const ExternError = runInNewContext('Error');
    const error = Object.assign(new ExternError('boom'), {
      status: 418,
      expose: true,
    });

    // @ts-expect-error protected method
    assert.doesNotThrow(() => app.onerror(error));
  });

  it('should do nothing if status is 404', () => {
    const app = new Koa();
    const err = new Error('test');

    (err as unknown as { status: number }).status = 404;

    mm.spy(console, 'error');
    // @ts-expect-error protected method
    app.onerror(err);
    assert.equal(
      (console.error as unknown as { called: boolean }).called,
      undefined
    );
  });

  it('should do nothing if .silent', () => {
    const app = new Koa();
    app.silent = true;
    const err = new Error('test');

    mm.spy(console, 'error');
    // @ts-expect-error protected method
    app.onerror(err);
    assert.equal(
      (console.error as unknown as { called: boolean }).called,
      undefined
    );
  });

  it('should log the error to stderr', () => {
    const app = new Koa();
    app.env = 'dev';

    const err = new Error('test');
    err.stack = 'Foo';

    mm.spy(console, 'error');
    // @ts-expect-error protected method
    app.onerror(err);
    assert.equal((console.error as unknown as { called: boolean }).called, 1);
  });
});
