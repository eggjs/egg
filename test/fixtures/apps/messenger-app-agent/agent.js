'use strict';

module.exports = function(agent) {
  agent.messenger.on('agent2agent', data => console.log(data));
  agent.messenger.on('app2agent', data => console.log(data));

  agent.messenger.once('egg-ready', () => {
    // wait egg ready
    agent.messenger.sendToApp('agent2app', 'agent2app');
    agent.messenger.sendToAgent('agent2agent', 'agent2agent');
  });
};
