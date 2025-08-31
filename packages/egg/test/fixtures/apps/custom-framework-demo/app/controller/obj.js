'use strict';

module.exports = app => {
  return {
    * bar() {
      this.ctx.body = 'this is obj bar!';
    },

    * error() {
      aaa;
    },

    subObj: {
      * hello() {
        this.ctx.body = 'this is subObj hello!';
      },
    },
  };
};
