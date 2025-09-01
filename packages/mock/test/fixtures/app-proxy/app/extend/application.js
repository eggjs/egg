'use strict';

module.exports = {
  get getter() {
    return 'getter';
  },
  method() {
    return 'method';
  },
  prop: 1,
  shouldBeDelete: true,

  get a() {
    return 'a';
  },
  set a(x) {
    this._a = x;
  },
};
