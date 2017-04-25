'use strict';

module.exports = {
  getLogger(name) {
    console.log('get custom %s logger', name);
    return new this.app.ContextLogger(this, console);
  },
};
