'use strict';

module.exports = function(agent) {
  agent.messenger.on('throw', () => {
    process.exit(1);
  });
  agent.messenger.on('egg-ready', data => {
    console.log(`agent receive egg-ready, with ${data.workers} workers`);
  });
};
