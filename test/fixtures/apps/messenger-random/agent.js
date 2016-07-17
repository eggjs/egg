'use strict';

module.exports = function(agent) {
  agent.messenger.on('egg-ready', () => {
    for (const i of Array(20)) {
      agent.messenger.sendRandom('agent2app');
    }
  });
};
