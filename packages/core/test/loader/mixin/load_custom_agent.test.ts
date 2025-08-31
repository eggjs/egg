import { strict as assert } from 'node:assert';
import { createApp } from '../../helper.js';

describe('test/loader/mixin/load_custom_agent.test.ts', () => {
  let agent: any;
  before(async () => {
    agent = createApp('plugin');
    await agent.loader.loadPlugin();
    await agent.loader.loadConfig();
    await agent.loader.loadCustomAgent();
  });
  after(() => agent.close());

  it('should load agent.js', () => {
    assert(agent.b === 'plugin b');
    assert(agent.c === 'plugin c');
    assert(agent.agent === 'agent');
  });

  it("should agent.js of plugin before application's", () => {
    assert(agent.dateB <= agent.date);
    assert(agent.dateC <= agent.date);
  });

  it('should not load plugin that is disabled', () => {
    assert(!agent.a);
  });
});
