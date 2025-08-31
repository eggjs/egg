'use strict';
var util = require('./util/bar');

module.exports = function () {
  return {
    bar: function* (ctx) {
      console.log(ctx);
    },
  };
};
