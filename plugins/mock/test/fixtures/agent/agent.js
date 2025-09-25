const Client = require('./client');

module.exports = agent => {
  const done = agent.readyCallback('agent:agent');
  setTimeout(() => {
    done();
  }, 100);

  agent.client = agent.cluster(Client).create();
};
