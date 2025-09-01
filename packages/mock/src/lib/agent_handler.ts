import { debuglog } from 'node:util';
import { createAgent, MockAgent } from './parallel/agent.js';
import { getEggOptions } from './utils.js';

const debug = debuglog('@eggjs/mock/lib/agent_handler');

let agent: MockAgent;

export async function setupAgent() {
  debug('setupAgent call, env.ENABLE_MOCHA_PARALLEL: %s, process.env.AUTO_AGENT: %s, agent: %s',
    process.env.ENABLE_MOCHA_PARALLEL, process.env.AUTO_AGENT, !!agent);
  if (agent) {
    await agent.ready();
    return agent;
  }
  if (process.env.ENABLE_MOCHA_PARALLEL && process.env.AUTO_AGENT) {
    agent = createAgent(getEggOptions());
    await agent.ready();
  }
  return agent;
}

export async function closeAgent() {
  debug('setupAgent call, agent: %s', !!agent);
  if (agent) {
    await agent.close();
  }
}
