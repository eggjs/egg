'use strict';

const client = require('./client');

module.exports = agent => {
  agent.startAgent({
    name: 'mock',
    client: client,
    subscribe: function(reg, listener) {
      console.log('agent subscribe', reg);
    },
  });

  agent.messenger.on('die', () => {
    process.exit(1);
  });
};
