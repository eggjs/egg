'use strict';

module.exports = app =>
  class UserService2 extends app.Service {
    get userInfo() {
      return 'service2';
    }
  };
