import { HttpClient, MockAgent, getGlobalDispatcher, setGlobalDispatcher } from 'urllib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getMockAgent, restoreMockAgent } from '../src/lib/mock_agent.ts';

describe('test/mock-agent.test.ts', () => {
  let originalDispatcher: ReturnType<typeof getGlobalDispatcher>;
  const dispatchers: ReturnType<typeof getGlobalDispatcher>[] = [];

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
  });

  afterEach(async () => {
    await restoreMockAgent();
    setGlobalDispatcher(originalDispatcher);
    await Promise.all(dispatchers.splice(0).map((dispatcher) => dispatcher.close()));
  });

  it('keeps default clients attached to the global dispatcher after restore', async () => {
    const httpClient = new HttpClient();
    getMockAgent({ httpClient }).get('http://localhost').intercept({ path: '/' }).reply(200, 'mocked');
    expect((await httpClient.request('http://localhost/')).data.toString()).toBe('mocked');
    await restoreMockAgent();

    const replacement = new MockAgent();
    dispatchers.push(replacement);
    replacement.disableNetConnect();
    replacement.get('http://localhost').intercept({ path: '/' }).reply(200, 'replacement');
    setGlobalDispatcher(replacement);
    expect(httpClient.getDispatcher()).toBe(replacement);
    expect((await httpClient.request('http://localhost/')).data.toString()).toBe('replacement');

    getMockAgent({ httpClient });
    await restoreMockAgent();
    expect(getGlobalDispatcher()).toBe(replacement);
    await restoreMockAgent();
    expect(getGlobalDispatcher()).toBe(replacement);
  });

  it('mocks and restores custom client dispatchers after the global mock already exists', async () => {
    const httpClient = new HttpClient({ allowH2: true });
    const dispatcher = httpClient.getDispatcher();
    dispatchers.push(dispatcher);
    getMockAgent();
    getMockAgent({ httpClient }).get('http://localhost').intercept({ path: '/' }).reply(200, 'custom');
    expect((await httpClient.request('http://localhost/')).data.toString()).toBe('custom');
    getMockAgent({ httpClient });
    await restoreMockAgent();
    expect(httpClient.getDispatcher()).toBe(dispatcher);
    expect(getGlobalDispatcher()).toBe(originalDispatcher);
  });
});
