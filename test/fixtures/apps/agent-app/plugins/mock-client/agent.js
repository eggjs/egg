'use strict';

const MockClient = require('./mock_client');

module.exports = agent => {
  const done = agent.readyCallback('agent_configclient');
  const options = agent.config.mock;

  agent.mockClient = new MockClient();

  // 启动 agent 任务
  agent.startAgent({
    client: agent.mockClient,
    name: 'mock',
    subscribe: function(info, listener) {
      agent.mockClient.on(info.id, listener);
      if (info.id === 'foo') {
        setTimeout(function() {
          agent.mockClient.emit('foo', 'bar');
        }, 100);
      }
    },
  });

  agent.mockClient.ready(() => {
    agent.logger.info('[agent] %s started mockClient', agent.config.name);
    done();
  });
};
