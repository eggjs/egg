import { mm } from 'mm';
import { extend } from 'extend2';
import type { Dispatcher, Headers, BodyInit } from 'urllib';
import { getMockAgent } from './mock_agent.js';

export interface MockResultOptions {
  data: string | Buffer | Record<string, any>;
  /**
   * http status
   */
  status?: number;
  /**
   * response header
   */
  headers?: Record<string, string>;
  /**
   * delay the associated reply by a set amount in ms
   */
  delay?: number;
  /**
   * any matching request will always reply with the defined response indefinitely
   */
  persist?: boolean;
  /**
   * any matching request will reply with the defined response a fixed amount of times
   */
  repeats?: number;
}
// keep compatible with old version
export type ResultObject = MockResultOptions;

export interface MockResponseCallbackOptions {
  path: string;
  method: string;
  headers?: Headers | Record<string, string>;
  origin?: string;
  body?: BodyInit | Dispatcher.DispatchOptions['body'] | null;
  maxRedirections?: number;
}

export type MockResultFunction =
  (url: string, options: MockResponseCallbackOptions) => MockResultOptions | string;

function normalizeResult(result: string | MockResultOptions) {
  if (typeof result === 'string') {
    result = { data: result };
  }

  if (!result.status) {
    result.status = 200;
  }

  result.data = result.data || '';
  if (Buffer.isBuffer(result.data)) {
    // do nothing
  } else if (typeof result.data === 'object') {
    // json
    result.data = Buffer.from(JSON.stringify(result.data));
  } else if (typeof result.data === 'string') {
    // string
    result.data = Buffer.from(result.data);
  } else {
    throw new Error('`mockResult.data` must be buffer, string or json');
  }
  result.headers = result.headers ?? {};
  return result;
}

const MOCK_CONFIGS = Symbol('MOCK_CONFIGS');
const MOCK_CONFIG_INDEX = Symbol('MOCK_CONFIG_INDEX');

export function createMockHttpClient(app: any) {
  /**
   * mock httpclient
   * @function mockHttpclient
   * @param {String} mockUrl - url
   * @param {String|Array} mockMethod - http method, default is '*'
   * @param {Object|Function} mockResult - you data
   *   - data - buffer / string / json
   *   - status - http status
   *   - headers - response header
   *   - delay - delay the associated reply by a set amount in ms.
   *   - persist - any matching request will always reply with the defined response indefinitely, default is true
   *   - repeats - number, any matching request will reply with the defined response a fixed amount of times
   */
  return function mockHttpClient(mockUrl: string | RegExp, mockMethod: string | string[] | MockResultOptions | MockResultFunction, mockResult?: MockResultOptions | MockResultFunction | string) {
    let mockMethods = mockMethod as string[];
    if (!mockResult) {
      // app.mockHttpclient(mockUrl, mockResult)
      mockResult = mockMethod as MockResultOptions;
      mockMethods = [ '*' ];
    }
    if (!Array.isArray(mockMethods)) {
      mockMethods = [ mockMethods ];
    }
    mockMethods = mockMethods.map(method => (method || 'GET').toUpperCase());

    // use MockAgent on undici
    let mockConfigs = app[MOCK_CONFIGS];
    if (!mockConfigs) {
      mockConfigs = [];
      mm(app, MOCK_CONFIGS, mockConfigs);
    }

    let mockConfigIndex = -1;
    let origin = mockUrl;
    let originMethod: ((value: string) => boolean) | undefined;
    const pathname = mockUrl;
    let pathMethod: (path: string) => boolean;
    if (typeof mockUrl === 'string') {
      const urlObject = new URL(mockUrl);
      origin = urlObject.origin;
      const originalPathname = urlObject.pathname;
      pathMethod = path => {
        if (path === originalPathname) return true;
        // should match /foo?a=1 including query
        if (path.includes('?')) return path.startsWith(originalPathname);
        return false;
      };
    } else if (mockUrl instanceof RegExp) {
      let requestOrigin = '';
      originMethod = value => {
        requestOrigin = value;
        return true;
      };
      pathMethod = path => {
        for (const config of mockConfigs) {
          if (config.mockUrl.test(`${requestOrigin}${path}`)) {
            mm(app, MOCK_CONFIG_INDEX, config.mockConfigIndex);
            return true;
          }
        }
        return false;
      };
      mockConfigIndex = mockConfigs.length;
      mockConfigs.push({ mockUrl, mockResult, mockConfigIndex });
    }
    const mockPool = originMethod
      ? getMockAgent(app).get(originMethod)
      : getMockAgent(app).get(originMethod ?? origin as string);
    // persist default is true
    let persist = true;
    if (typeof mockResult === 'object' && typeof mockResult.persist === 'boolean') {
      persist = mockResult.persist;
    }
    mockMethods.forEach(function(method) {
      const mockScope = mockPool.intercept({
        path: pathMethod ?? pathname,
        method: method === '*' ? () => true : method,
      }).reply(options => {
        // not support mockResult as an async function
        const requestUrl = `${options.origin}${options.path}`;
        let mockRequestResult;
        if (mockConfigIndex >= 0) {
          mockResult = mockConfigs[app[MOCK_CONFIG_INDEX]].mockResult;
          mockRequestResult = typeof mockResult === 'function' ? mockResult(requestUrl, options) : mockResult;
        } else {
          mockRequestResult = typeof mockResult === 'function' ? mockResult(requestUrl, options) : mockResult;
        }
        const result = extend(true, {}, normalizeResult(mockRequestResult!));
        return {
          statusCode: result.status,
          data: result.data,
          responseOptions: {
            headers: result.headers,
          },
        };
      });
      if (typeof mockResult === 'object') {
        if (mockResult.delay && mockResult.delay > 0) {
          mockScope.delay(mockResult.delay);
        }
      }
      if (persist) {
        mockScope.persist();
      } else if (typeof mockResult === 'object' && mockResult.repeats && mockResult.repeats > 0) {
        mockScope.times(mockResult.repeats);
      }
    });
  };
}

export type MockHttpClientMethod = ReturnType<typeof createMockHttpClient>;
