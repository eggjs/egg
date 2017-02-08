'use strict';

module.exports = agent => {
  agent.messenger.on('agent-throw', () => {
    throw new Error('agent error');
  });

  agent.messenger.on('agent-throw-string', () => {
    throw 'agent error string';
  });
};
