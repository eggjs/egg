import { mock, restore } from 'mm';
import { EggCore } from '@eggjs/core';
import {
  createMockHttpClient, MockResultFunction,
  MockResultOptions,
  MockHttpClientMethod,
} from '../../lib/mock_httpclient.js';
import { getMockAgent, restoreMockAgent } from '../../lib/mock_agent.js';

export default abstract class AgentUnittest extends EggCore {
  [key: string]: any;
  _mockHttpClient: MockHttpClientMethod;

  /**
   * mock httpclient
   * @alias mockHttpClient
   * @function App#mockHttpclient
   */
  mockHttpclient(mockUrl: string | RegExp, mockMethod: string | string[] | MockResultOptions | MockResultFunction, mockResult?: MockResultOptions | MockResultFunction | string) {
    return this.mockHttpClient(mockUrl, mockMethod, mockResult);
  }

  /**
   * mock httpclient
   * @function App#mockHttpClient
   */
  mockHttpClient(mockUrl: string | RegExp, mockMethod: string | string[] | MockResultOptions | MockResultFunction, mockResult?: MockResultOptions | MockResultFunction | string) {
    if (!this._mockHttpClient) {
      this._mockHttpClient = createMockHttpClient(this);
    }
    return this._mockHttpClient(mockUrl, mockMethod, mockResult);
  }

  /**
   * get mock httpclient agent
   * @function Agent#mockHttpclientAgent
   */
  mockAgent() {
    return getMockAgent(this as any);
  }

  async mockAgentRestore() {
    await restoreMockAgent();
  }

  /**
   * @see mm#restore
   * @function Agent#mockRestore
   */
  mockRestore = restore;

  /**
   * @see mm
   * @function Agent#mm
   */
  mm = mock;
}
