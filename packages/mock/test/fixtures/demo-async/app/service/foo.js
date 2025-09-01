'use strict';

module.exports = function(app) {
  class Foo extends app.Service {
    async get() {
      return 'bar';
    }

    getSync() {
      return 'bar';
    }
  }

  return Foo;
};
