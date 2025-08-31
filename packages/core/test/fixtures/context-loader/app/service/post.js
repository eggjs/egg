'use strict';

module.exports = app =>
  class UserService1 extends app.Service {
    get postInfo() {
      return 'post';
    }
  };
