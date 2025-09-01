'use strict';

module.exports = app => {
  app.ready(() => {
    app.emit('agentInstantiated');
  });
};
