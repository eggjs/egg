'use strict';

module.exports = agent => {
  agent.messenger.on('egg-ready', () => {
    process.exit(1);
  });
};
