'use strict';

module.exports = function (agent) {
  agent.messenger.on('log-reload', () => console.log('agent got log-reload'));
};
