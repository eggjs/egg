'use strict';

module.exports = function(agent) {
  agent.messenger.on('custom-framework-worker', function(data) {
    agent.messenger.broadcast('custom-framework-agent', data);
  });
};
