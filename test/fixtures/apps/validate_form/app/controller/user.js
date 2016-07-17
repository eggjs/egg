'use strict';

const createRule = {
  username: {
    type: 'email',
  },
  password: {
    type: 'password',
    compare: 're-password'
  },
};

exports.create = function* () {
  this.validate(createRule);
  this.body = this.request.body;
};
