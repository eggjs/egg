'use strict';

module.exports = function () {
  return {
    *bar(ctx) {
      console.log(ctx);
    },

    *bar1(ctx) {
      console.log(ctx);
    },

    aa: function* (ctx) {
      console.log(ctx);
    },
  };
};
