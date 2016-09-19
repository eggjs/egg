'use strict';

module.exports = function initAgent(agent) {
  const client = {
    'mock-data': 'mock-data',
    'not-exist-data': null,
    ready(cb) {
      setImmediate(cb);
    },
  };

  agent.startAgent({
    name: 'sub-client',
    client,
    subscribe(info, listener) {
      listener(client[info]);
    },
  });
};
