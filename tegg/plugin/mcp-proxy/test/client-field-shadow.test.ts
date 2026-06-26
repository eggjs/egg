import assert from 'node:assert';

import { describe, it } from 'vitest';

// Regression guard for the MCPProxyApiClient `_client` field shadowing fix.
//
// MCPProxyApiClient extends cluster-client's APIClientBase, whose constructor
// assigns `this._client` (the data-client delegate). Declaring `_client` as a
// real class field (without `declare`) re-initialises it to `undefined` AFTER
// super() under useDefineForClassFields (target ES2022) — masking the base
// value, so registerClient()/unregisterClient()/getClient() call into undefined.
// The field must be `declare`d so it is a type-only annotation emitting no
// runtime initializer.
//
// Constructing a real cluster-client in a unit test is heavy, so this pins the
// exact language/build semantics the fix relies on, under the same toolchain the
// published package is built with.
describe('plugin/mcp-proxy/test/client-field-shadow.test.ts', () => {
  class FakeAPIClientBase {
    _client: unknown;
    constructor() {
      // Mirror APIClientBase: the base sets _client in its constructor.
      this._client = {
        registerClient() {
          return true;
        },
      };
    }
  }

  it('a bare subclass field re-initialises the base value to undefined (the bug)', () => {
    class Shadowed extends FakeAPIClientBase {
      _client: unknown;
    }
    assert.strictEqual(new Shadowed()._client, undefined);
  });

  it('`declare` keeps the base-class value across super() (the fix)', () => {
    class Declared extends FakeAPIClientBase {
      declare _client: unknown;
    }
    const client = new Declared()._client as { registerClient(): boolean } | undefined;
    assert.ok(client, '_client must survive super(), not be shadowed to undefined');
    assert.strictEqual(typeof client.registerClient, 'function');
  });
});
