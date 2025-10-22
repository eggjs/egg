import { mock, restore } from 'mm';
import { Agent } from 'egg';
import type { MockAgent } from 'urllib';

import {
  createMockHttpClient,
  type MockResultFunction,
  type MockResultOptions,
  type MockHttpClientMethod,
} from '../../lib/mock_httpclient.ts';
import { getMockAgent, restoreMockAgent } from '../../lib/mock_agent.ts';

export default abstract class AgentUnittest extends Agent {
  [key: string]: any;
  _mockHttpClient: MockHttpClientMethod;

  /**
   * mock httpclient
   * @alias mockHttpClient
   * @function App#mockHttpclient
   */
  mockHttpclient(
    mockUrl: string | RegExp,
    mockMethod: string | string[] | MockResultOptions | MockResultFunction,
    mockResult?: MockResultOptions | MockResultFunction | string,
  ): this {
    return this.mockHttpClient(mockUrl, mockMethod, mockResult);
  }

  /**
   * mock httpclient
   * @function App#mockHttpClient
   */
  mockHttpClient(
    mockUrl: string | RegExp,
    mockMethod: string | string[] | MockResultOptions | MockResultFunction,
    mockResult?: MockResultOptions | MockResultFunction | string,
  ): this {
    if (!this._mockHttpClient) {
      this._mockHttpClient = createMockHttpClient(this);
    }
    this._mockHttpClient(mockUrl, mockMethod, mockResult);
    return this;
  }

  /**
   * get mock httpclient agent
   * @function Agent#mockHttpclientAgent
   */
  mockAgent(): MockAgent {
    return getMockAgent(this as any);
  }

  async mockAgentRestore(): Promise<void> {
    await restoreMockAgent();
  }

  /**
   * @see mm#restore
   * @function Agent#mockRestore
   */
  mockRestore: typeof restore = restore;

  /**
   * @see mm
   * @function Agent#mm
   */
  mm: typeof mock = mock;
}
