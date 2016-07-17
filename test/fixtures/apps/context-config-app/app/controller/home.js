'use strict';

exports.index = function* () {
  this.body = {
    path: this.router.pathFor('home'),
    foo: this.foo,
    bar: this.bar()
  };
};

exports.runtime = function* () {
  this.runtime.mysql = 10;
  this.runtime.foo = 11;
  this.body = {
    mysql: this.runtime.mysql,
    foo: this.runtime.foo
  };
};
