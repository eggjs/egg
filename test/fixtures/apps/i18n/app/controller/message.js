'use strict';

module.exports = function* () {
  this.body = {
    message: this.__('Hello %s, how are you today? How was your %s.', 'fengmk2', 18),
    empty: this.__(),
    notexists_key: this.__('key not exists'),
    empty_string: this.__(''),
    novalue: this.__('key %s ok'),
    // __ 别名 gettext 也可以使用
    arguments3: this.gettext('%s %s %s', 1, 2, 3),
    arguments4: this.gettext('%s %s %s %s', 1, 2, 3, 4),
    arguments5: this.__('%s %s %s %s %s', 1, 2, 3, 4, 5),
    arguments6: this.__('%s %s %s %s %s.', 1, 2, 3, 4, 5, 6),
    values: this.__('{0} {1} {0} {1} {2} {100}', ['foo', 'bar']),
  };
};
