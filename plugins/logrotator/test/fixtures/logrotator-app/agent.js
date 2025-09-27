'use strict';

module.exports = agent => {
  agent.messenger.on('log-reload', () => console.log('agent got log-reload'));
};
