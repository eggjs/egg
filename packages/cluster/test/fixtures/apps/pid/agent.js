'use strict';

module.exports = function(agent) {
  let count = 1;
  agent.messenger.on('egg-pids', data => console.log('#%s agent get %s workers', count++, data.length, data));
};


process.on('message', function(msg) {
  if (msg.action === 'kill-agent') process.exit(1);
});
