'use strict';

module.exports = function(agent) {
  agent.messenger.on('app-to-agent', function(msg) {
    console.log('[agent] app-to-agent', msg);
  });
  agent.messenger.on('agent-to-app', function(msg) {
    console.log('[agent] agent-to-app', msg);
  });

  agent.messenger.on('pid', pid => agent.messenger.sendTo(pid, 'agent-to-app', 'agent msg ' + pid));
  agent.messenger.on('ready', () => agent.messenger.send('agent-to-app', 'agent msg'));
};
