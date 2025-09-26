'use strict';

module.exports = app => {
  return class UserService extends app.Service {
    async hello(name) {
      return `hello ${name}`;
    }
  };
};
