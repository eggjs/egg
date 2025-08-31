'use strict';

module.exports = app =>
  class UserService1 extends app.Service {
    get userInfo() {
      return 'service1';
    }
  };
