'use strict';

module.exports = function(agent) {
  agent.messenger.on('egg-ready', () => {
    agent.messenger.on('app-to-agent', function(msg) {
      console.log('[agent] app-to-agent', msg);
    });
    agent.messenger.on('agent-to-app', function(msg) {
      console.log('[agent] agent-to-app', msg);
    });

    agent.messenger.on('pid', pid => {
      agent.messenger.sendTo(pid, 'agent-to-app', 'agent msg ' + pid);
    });
    agent.messenger.on('ready', () => {
      agent.messenger.send('agent-to-app', 'agent msg');
    });
  });

  // it'll warn
  agent.messenger.sendTo(12345, 'warn-message');
  agent.messenger.sendToApp('warn-message');
  agent.messenger.sendToAgent('warn-message');
  agent.messenger.sendRandom('warn-message');
  agent.messenger.broadcast('warn-message');
};
