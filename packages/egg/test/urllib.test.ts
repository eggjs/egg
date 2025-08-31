import { strict as assert } from 'node:assert';
import * as urllib from '../src/urllib.js';

describe('test/urllib.test.ts', () => {
  it('should expose properties', () => {
    assert.deepEqual(Object.keys(urllib).sort(), [
      'Agent',
      'Dispatcher',
      'FetchFactory',
      'FormData',
      'Headers',
      'HttpClient',
      'HttpClient2',
      'HttpClientConnectTimeoutError',
      'HttpClientRequestError',
      'HttpClientRequestTimeoutError',
      'MockAgent',
      'ProxyAgent',
      'Request',
      'Response',
      'USER_AGENT',
      'WebFormData',
      'curl',
      'fetch',
      'getDefaultHttpClient',
      'getGlobalDispatcher',
      'request',
      'setGlobalDispatcher',
    ]);

    assert.equal(typeof urllib.MockAgent, 'function');
  });
});
