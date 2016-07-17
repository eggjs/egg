'use strict';

module.exports = agent => {
  agent.messenger.on('agent-throw', () => {
    throw new Error('agent error');
  });
};
