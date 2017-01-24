'use strict';

exports.index = function* () {
  this.body = {
    path: this.router.pathFor('home'),
    foo: this.foo,
    bar: this.bar()
  };
};
