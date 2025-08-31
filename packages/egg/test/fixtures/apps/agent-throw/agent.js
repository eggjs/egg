module.exports = agent => {
  agent.messenger.on('agent-throw', () => {
    throw new Error('agent error in sync function');
  });

  agent.messenger.on('agent-throw-async', async () => {
    throw new Error('agent error in async function');
  });

  agent.messenger.on('agent-throw-string', () => {
    throw 'agent error string';
  });
};
