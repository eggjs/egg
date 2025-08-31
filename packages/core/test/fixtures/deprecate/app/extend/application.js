'use strict';

module.exports = {
  get env() {
    this.deprecate('please use app.config.env instead');
    return this.deprecate;
  },
};
