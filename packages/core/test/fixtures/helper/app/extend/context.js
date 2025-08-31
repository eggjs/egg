'use strict';

module.exports = {
  get helper() {
    return new this.app.Helper(this);
  },
};
