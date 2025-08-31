'use strict';

module.exports = agent => {
  agent.messenger.on('custom-aliyun-egg-worker', data => {
    agent.messenger.broadcast('custom-aliyun-egg-agent', data);
  })
};
