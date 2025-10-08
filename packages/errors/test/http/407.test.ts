import { describe, it } from 'vitest';

import { strict as assert } from 'assert';
import { ProxyAuthenticationRequiredError, E407 } from '../../src/index.ts';

describe('test/http/407.test.ts', () => {
  it('should instantiate', () => {
    const err = new ProxyAuthenticationRequiredError();
    assert(err.code === 'PROXY_AUTHENTICATION_REQUIRED');
    assert(err.message === 'Proxy Authentication Required');
    assert(err.name === 'ProxyAuthenticationRequiredError');
    assert(err.status === 407);
  });

  it('should alias to short name E407', () => {
    const err = new E407();
    assert(err.code === 'PROXY_AUTHENTICATION_REQUIRED');
    assert(err.message === 'Proxy Authentication Required');
    assert(err.name === 'ProxyAuthenticationRequiredError');
    assert(err.status === 407);
  });
});
