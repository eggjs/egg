'use strict';

module.exports = function(app) {
  app.messenger.on('agent-start', () => console.log('app get agent-start'));
};
