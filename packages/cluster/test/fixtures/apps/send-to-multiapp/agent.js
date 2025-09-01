'use strict';

module.exports = function(agent) {
  let pids;
  agent.messenger.on('egg-pids', data => {
    pids = data;
  });
  agent.messenger.on('egg-ready', () => {
    agent.messenger.sendTo(String(pids[pids.length - 1]), 'app');
  });
};
