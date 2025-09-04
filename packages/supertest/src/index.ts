import { Request, type RequestOptions } from './request.ts';
import { TestAgent, proxyAgent } from './agent.ts';
import type { App, AgentOptions } from './types.ts';

/**
 * Test against the given `app`,
 * returning a new `Test`.
 */
export function request(app: App, options: RequestOptions = {}) {
  return new Request(app, options);
}

export {
  Request,
  type RequestOptions,
  TestAgent,
  // import { agent } from '@eggjs/supertest';
  // agent()
  proxyAgent as agent,
};

export * from './test.ts';

// import request from '@eggjs/supertest';
// request()
export default new Proxy(request, {
  apply(target, _, argumentsList) {
    return target(argumentsList[0], argumentsList[1]);
  },
  get(target, property, receiver) {
    // import request from '@eggjs/supertest';
    // request.agent()
    if (property === 'agent') {
      return proxyAgent;
    }
    return Reflect.get(target, property, receiver);
  },
}) as unknown as ((app: App, options?: RequestOptions) => Request) & {
  agent: (app: App, options?: AgentOptions) => TestAgent;
};
