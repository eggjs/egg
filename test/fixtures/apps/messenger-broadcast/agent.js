'use strict';

module.exports = function(agent) {
  agent.messenger.on('egg-ready', () => {
    agent.messenger.broadcast('broadcast', {
      from: 'agent',
      pid: process.pid,
    });
  });

  agent.messenger.on('broadcast', info => {
    console.log('agent %s receive message from %s pid %s', process.pid, info.from, info.pid);
  });
};
