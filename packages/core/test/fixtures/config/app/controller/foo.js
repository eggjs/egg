'use strict';

var util = require('./util/a');
module.exports = function () {
  return {
    a: function* () {
      util.b();
      this.body = 'hello';
    },
  };
};
