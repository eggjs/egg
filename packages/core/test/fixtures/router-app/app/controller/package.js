'use strict';

exports.get = async function () {
  this.body = this.params[0];
};
