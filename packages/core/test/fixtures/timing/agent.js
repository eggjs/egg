'use strict';

const block = require('./block');

module.exports = agent => {
  block();

  agent.beforeStart(function* () {
    block();
  });
};
