'use strict';

const MockClient = require('./mock_client');

module.exports = agent => {
  const done = agent.readyCallback('agent_configclient');
  const options = agent.config.mock;

  agent.mockClient = new MockClient();

  let count = 0;
  // 启动 agent 任务
  agent.startAgent({
    client: agent.mockClient,
    name: 'mock',
    subscribe(info, listener) {
      agent.mockClient.on(info.id, listener);
      if (info.id === 'foo') {
        setInterval(() => {
          agent.mockClient.emit('foo', ++count);
        }, 100);
      }
    },
  });

  agent.mockClient.ready(() => {
    agent.logger.info('[agent] %s started mockClient', agent.config.name);
    done();
  });
};
