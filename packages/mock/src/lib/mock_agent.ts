import { debuglog } from 'node:util';
import {
  MockAgent, setGlobalDispatcher, getGlobalDispatcher, Dispatcher,
  HttpClient,
} from 'urllib';

const debug = debuglog('@eggjs/mock/lib/mock_agent');

declare namespace globalThis {
  let __mockAgent: MockAgent | null;
  let __globalDispatcher: Dispatcher;
  let __httpClientDispatchers: Map<HttpClient, Dispatcher>;
}

globalThis.__mockAgent = null;
globalThis.__httpClientDispatchers = new Map<HttpClient, Dispatcher>();

export function getMockAgent(app?: { httpClient?: HttpClient }) {
  debug('getMockAgent');
  if (!globalThis.__globalDispatcher) {
    globalThis.__globalDispatcher = getGlobalDispatcher();
    debug('create global dispatcher');
  }
  if (app?.httpClient && !globalThis.__httpClientDispatchers.has(app.httpClient)) {
    globalThis.__httpClientDispatchers.set(app.httpClient, app.httpClient.getDispatcher());
    debug('add new httpClient, size: %d', globalThis.__httpClientDispatchers.size);
  }
  if (!globalThis.__mockAgent) {
    globalThis.__mockAgent = new MockAgent();
    setGlobalDispatcher(globalThis.__mockAgent);
    if (typeof app?.httpClient?.setDispatcher === 'function') {
      app.httpClient.setDispatcher(globalThis.__mockAgent);
    }
    debug('create new mockAgent');
  }
  return globalThis.__mockAgent;
}

export async function restoreMockAgent() {
  debug('restoreMockAgent start');
  if (globalThis.__globalDispatcher) {
    setGlobalDispatcher(globalThis.__globalDispatcher);
    debug('restore global dispatcher');
  }
  debug('restore httpClient, size: %d', globalThis.__httpClientDispatchers.size);
  for (const [ httpClient, dispatcher ] of globalThis.__httpClientDispatchers) {
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
