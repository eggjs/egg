'use strict';

module.exports = agent => {
  agent.startAgent({
    name: 'test',
    client: { ready: cb => cb() },
    subscribe: (info, cb) => cb('test'),
  });
};
