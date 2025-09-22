import { inspect } from 'node:util';
import { STATUS_CODES } from 'node:http';
import { Server as HttpsServer } from 'node:tls';
import type { Server, AddressInfo } from 'node:net';
import { deepStrictEqual } from 'node:assert';

import { Request, type Response } from 'superagent';

import { AssertError } from './error/AssertError.ts';

export type TestApplication = Server | string;

export type AssertFunction = (res: Response) => AssertError | void;
export type CallbackFunction = (err: AssertError | Error | null, res: Response) => void;
export type ResponseError = Error & {
  syscall?: string;
  code?: string;
  status?: number;
};
export interface ExpectHeader {
  name: string;
  value: string | number | RegExp;
}

export class Test extends Request {
  app: TestApplication;
  _server: Server;
  _asserts: AssertFunction[] = [];

  /**
   * Initialize a new `Test` with the given `app`,
   * request `method` and `path`.
   */
  constructor(app: TestApplication, method: string, path: string) {
    super(method.toUpperCase(), path);

    this.redirects(0);
    this.buffer();
    this.app = app;
    this.url = typeof app === 'string' ? app + path : this.serverAddress(app, path);
  }

  /**
   * Returns a URL, extracted from a server.
   *
   * @return {String} URL address
   * @private
   */
  protected serverAddress(app: Server, path: string): string {
    const addr = app.address();
    if (!addr) {
      this._server = app.listen(0);
    }
    const port = (app.address() as AddressInfo).port;
    const protocol = app instanceof HttpsServer || this._server instanceof HttpsServer ? 'https' : 'http';
    return `${protocol}://127.0.0.1:${port}${path}`;
  }

  /**
   * Expectations:
   *
   * ```js
   *   .expect(200)
   *   .expect(200, fn)
   *   .expect(200, body)
   *   .expect('Some body')
   *   .expect('Some body', fn)
   *   .expect(['json array body', { key: 'val' }])
   *   .expect('Content-Type', 'application/json')
   *   .expect('Content-Type', 'application/json', fn)
   *   .expect(fn)
   *   .expect([200, 404])
   * ```
   *
   * @return {Test} The current Test instance for chaining.
   */
  expect(
    a: number | string | RegExp | object | AssertFunction,
    b?: string | number | RegExp | CallbackFunction,
    c?: CallbackFunction
  ): Test {
    // callback
    if (typeof a === 'function') {
      // .expect(fn)
      this._asserts.push(wrapAssertFn(a as AssertFunction));
      return this;
    }
    if (typeof b === 'function') {
      // .expect('Some body', fn)
      this.end(b);
    }
    if (typeof c === 'function') {
      // .expect('Content-Type', 'application/json', fn)
      this.end(c);
    }

    // status
    if (typeof a === 'number') {
      this._asserts.push(wrapAssertFn(this._assertStatus.bind(this, a)));
      // body
      if (typeof b !== 'function' && arguments.length > 1) {
        // .expect(200, 'body')
        // .expect(200, null)
        // .expect(200, 9999999)
        this._asserts.push(wrapAssertFn(this._assertBody.bind(this, b)));
      }
      return this;
    }

    // multiple statuses
    if (Array.isArray(a) && a.length > 0 && a.every(val => typeof val === 'number')) {
      // .expect([200, 300])
      this._asserts.push(wrapAssertFn(this._assertStatusArray.bind(this, a)));
      return this;
    }

    // header field
    if (typeof b === 'string' || typeof b === 'number' || b instanceof RegExp) {
      // .expect('Content-Type', 'application/json')
      // .expect('Content-Type', /json/)
      this._asserts.push(wrapAssertFn(this._assertHeader.bind(this, { name: String(a), value: b })));
      return this;
    }

    // body
    // .expect('body')
    // .expect(['json array body', { key: 'val' }])
    // .expect(/foo/)
    this._asserts.push(wrapAssertFn(this._assertBody.bind(this, a)));

    return this;
  }

  /**
   * UnExpectations:
   *
   *   .unexpectHeader('Content-Type')
   *   .unexpectHeader('Content-Type', fn)
   */
  unexpectHeader(name: string, fn?: CallbackFunction) {
    if (typeof fn === 'function') {
      this.end(fn);
    }

    // header
    if (typeof name === 'string') {
      this._asserts.push(this._unexpectHeader.bind(this, name));
    }
    return this;
  }

  /**
   * Expectations:
   *
   *   .expectHeader('Content-Type')
   *   .expectHeader('Content-Type', fn)
   */
  expectHeader(name: string, fn?: CallbackFunction) {
    if (typeof fn === 'function') {
      this.end(fn);
    }

    // header
    if (typeof name === 'string') {
      this._asserts.push(this._expectHeader.bind(this, name));
    }
    return this;
  }

  _unexpectHeader(name: string, res: Response) {
    const actual = res.headers[name.toLowerCase()];
    if (actual) {
      return new AssertError('unexpected "' + name + '" header field, got "' + actual + '"', name, actual);
    }
  }

  _expectHeader(name: string, res: Response) {
    const actual = res.headers[name.toLowerCase()];
    if (!actual) {
      return new AssertError('expected "' + name + '" header field', name, actual);
    }
  }

  /**
   * Defer invoking superagent's `.end()` until
   * the server is listening.
   */
  end(fn: CallbackFunction) {
    const server = this._server;

    super.end((err, res) => {
      const localAssert = () => {
        this.assert(err, res, fn);
      };

      if (server && '_handle' in server && server._handle) {
        return server.close(localAssert);
      }

      localAssert();
    });

    return this;
  }

  /**
   * Perform assertions and invoke `fn(err, res)`.
   */
  assert(resError: ResponseError | null, res: Response, fn: CallbackFunction) {
    let errorObj: Error | undefined;

    // check for unexpected network errors or server not running/reachable errors
    // when there is no response and superagent sends back a System Error
    // do not check further for other asserts, if any, in such case
    // https://nodejs.org/api/errors.html#errors_common_system_errors
    const sysErrors: Record<string, string> = {
      ECONNREFUSED: 'Connection refused',
      ECONNRESET: 'Connection reset by peer',
      EPIPE: 'Broken pipe',
      ETIMEDOUT: 'Operation timed out',
    };

    if (!res && resError) {
      if (resError instanceof Error && resError.syscall === 'connect' && resError.code && sysErrors[resError.code]) {
        errorObj = new Error(resError.code + ': ' + sysErrors[resError.code]);
      } else {
        errorObj = resError;
      }
    }

    // asserts
    for (let i = 0; i < this._asserts.length && !errorObj; i += 1) {
      errorObj = this._assertFunction(this._asserts[i], res);
    }

    // set unexpected superagent error if no other error has occurred.
    if (!errorObj && resError instanceof Error && (!res || resError.status !== res.status)) {
      errorObj = resError;
    }

    if (!fn) {
      console.warn('[@eggjs/supertest] no callback function provided, fn: %s', typeof fn);
      return;
    }
    fn.call(this, errorObj || null, res);
  }

  /**
   * Perform assertions on a response body and return an Error upon failure.
   */
  _assertBody(body: RegExp | string | number | object | null | undefined, res: Response) {
    const isRegexp = body instanceof RegExp;

    // parsed
    if (typeof body === 'object' && !isRegexp) {
      try {
        deepStrictEqual(body, res.body);
      } catch (err) {
        const a = inspect(body);
        const b = inspect(res.body);
        return new AssertError('expected ' + a + ' response body, got ' + b, body, res.body, { cause: err });
      }
    } else if (body !== res.text) {
      // string
      const a = inspect(body);
      const b = inspect(res.text);

      // regexp
      if (isRegexp) {
        if (!body.test(res.text)) {
          return new AssertError('expected body ' + b + ' to match ' + body, body, res.body);
        }
      } else {
        return new AssertError('expected ' + a + ' response body, got ' + b, body, res.body);
      }
    }
  }

  /**
   * Perform assertions on a response header and return an Error upon failure.
   */
  _assertHeader(header: ExpectHeader, res: Response) {
    const field = header.name;
    const actual = res.header[field.toLowerCase()];
    const fieldExpected = header.value;

    if (typeof actual === 'undefined') {
      return new AssertError('expected "' + field + '" header field', header, actual);
    }
    // This check handles header values that may be a String or single element Array
    if ((Array.isArray(actual) && actual.toString() === fieldExpected) || fieldExpected === actual) {
      return;
    }
    if (fieldExpected instanceof RegExp) {
      if (!fieldExpected.test(actual)) {
        return new AssertError(
          'expected "' + field + '" matching ' + fieldExpected + ', got "' + actual + '"',
          header,
          actual
        );
      }
    } else {
      return new AssertError(
        'expected "' + field + '" of "' + fieldExpected + '", got "' + actual + '"',
        header,
        actual
      );
    }
  }

  /**
   * Perform assertions on the response status and return an Error upon failure.
   */
  _assertStatus(status: number, res: Response) {
    if (res.status !== status) {
      const a = STATUS_CODES[status];
      const b = STATUS_CODES[res.status];
      return new AssertError(
        'expected ' + status + ' "' + a + '", got ' + res.status + ' "' + b + '"',
        status,
        res.status
      );
    }
  }

  /**
   * Perform assertions on the response status and return an Error upon failure.
   */
  _assertStatusArray(statusArray: number[], res: Response) {
    if (!statusArray.includes(res.status)) {
      const b = STATUS_CODES[res.status];
      const expectedList = statusArray.join(', ');
      return new AssertError(
        'expected one of "' + expectedList + '", got ' + res.status + ' "' + b + '"',
        statusArray,
        res.status
      );
    }
  }

  /**
   * Performs an assertion by calling a function and return an Error upon failure.
   */
  _assertFunction(fn: AssertFunction, res: Response) {
    let err;
    try {
      err = fn(res);
    } catch (e) {
      err = e;
    }
    if (err instanceof Error) {
      return err;
    }
  }
}

/**
 * Wraps an assert function into another.
 * The wrapper function edit the stack trace of any assertion error, prepending a more useful stack to it.
 *
 * @param {Function} assertFn
 * @return {Function} wrapped assert function
 */

function wrapAssertFn(assertFn: AssertFunction) {
  const savedStack = new Error().stack!.split('\n').slice(3);

  return (res: Response) => {
    let badStack;
    let err;
    try {
      err = assertFn(res);
    } catch (e: any) {
      err = e;
    }
    if (err instanceof Error && err.stack) {
      badStack = err.stack.replace(err.message, '').split('\n').slice(1);
      err.stack = [err.toString()].concat(savedStack).concat('----').concat(badStack).join('\n');
    }
    return err;
  };
}
