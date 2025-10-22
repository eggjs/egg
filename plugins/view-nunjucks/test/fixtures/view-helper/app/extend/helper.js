'use strict';

exports.someMethod = (str) => `test ${str}`;

exports.foo = (bar) => `value: ${bar}`;

exports.arr = [(bar) => `value: ${bar}`];

exports.obj = {
  a(bar) {
    return `value: ${bar}`;
  },
};
