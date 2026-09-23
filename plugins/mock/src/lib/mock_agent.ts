import { debuglog } from 'node:util';

import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher, HttpClient } from 'urllib';

const debug = debuglog('egg/mock/lib/mock_agent');

declare namespace globalThis {
  let __mockAgent: MockAgent | null;
  let __globalDispatcher: Dispatcher | undefined;
  let __httpClientDispatchers: Map<HttpClient, Dispatcher>;
}

globalThis.__mockAgent = null;
globalThis.__httpClientDispatchers = new Map<HttpClient, Dispatcher>();

export function getMockAgent(app?: { httpClient?: HttpClient }): MockAgent {
  debug('getMockAgent');
  if (!globalThis.__mockAgent) {
    globalThis.__globalDispatcher = getGlobalDispatcher();
    debug('create global dispatcher');
  }
  if (app?.httpClient && !globalThis.__httpClientDispatchers.has(app.httpClient)) {
    const dispatcher = app.httpClient.getDispatcher();
    // Clients that use the global dispatcher already follow setGlobalDispatcher.
    // Keep them global after restore, including Node.js 26's built-in dispatcher.
    if (dispatcher !== getGlobalDispatcher()) {
      globalThis.__httpClientDispatchers.set(app.httpClient, dispatcher);
      debug('add new httpClient, size: %d', globalThis.__httpClientDispatchers.size);
    }
  }
  if (!globalThis.__mockAgent) {
    globalThis.__mockAgent = new MockAgent();
    setGlobalDispatcher(globalThis.__mockAgent);
    debug('create new mockAgent');
  }
  if (app?.httpClient && globalThis.__httpClientDispatchers.has(app.httpClient)) {
    app.httpClient.setDispatcher(globalThis.__mockAgent);
  }
  return globalThis.__mockAgent;
}

export async function restoreMockAgent(): Promise<void> {
  debug('restoreMockAgent start');
  if (globalThis.__globalDispatcher) {
    setGlobalDispatcher(globalThis.__globalDispatcher);
    globalThis.__globalDispatcher = undefined;
    debug('restore global dispatcher');
  }
  debug('restore httpClient, size: %d', globalThis.__httpClientDispatchers.size);
  for (const [httpClient, dispatcher] of globalThis.__httpClientDispatchers) {
    httpClient.setDispatcher(dispatcher);
  }
  globalThis.__httpClientDispatchers.clear();
  if (globalThis.__mockAgent) {
    const agent = globalThis.__mockAgent;
    globalThis.__mockAgent = null;
    await agent.close();
    debug('close mockAgent');
  }
  debug('restoreMockAgent end');
}
