'use strict';

module.exports = function (agent) {
  agent.date = Date.now();
  agent.agent = 'agent';
};
