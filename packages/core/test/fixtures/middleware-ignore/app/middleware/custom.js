'use strict';

module.exports = function () {
  return function* appCustom() {
    this.body = 'app custom';
  };
};
