'use strict';

module.exports = function(app) {
  class Main extends app.Service {
    async get() {
      return 'third';
    }
  }

  return Main;
};
