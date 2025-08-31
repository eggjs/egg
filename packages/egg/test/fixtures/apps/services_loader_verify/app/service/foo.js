'use strict';

module.exports = () => {
  return {
    *bar(ctx) {
      console.log(ctx);
    },

    * bar1(ctx) {
      console.log(ctx);
    },

    aa: function*(ctx) {
      console.log(ctx);
    }
  };
};
