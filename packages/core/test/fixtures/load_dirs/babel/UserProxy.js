'use strict';

var _temporalUndefined = {};

var _createClass = (function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ('value' in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

var UserProxy = _temporalUndefined;

function _temporalAssertDefined(val, name, undef) {
  if (val === undef) {
    throw new ReferenceError(name + ' is not defined - temporal dead zone');
  }
  return true;
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError('Cannot call a class as a function');
  }
}

UserProxy = (function () {
  function UserProxy() {
    _classCallCheck(
      this,
      _temporalAssertDefined(UserProxy, 'UserProxy', _temporalUndefined) &&
        UserProxy
    );

    this.user = {
      name: 'xiaochen.gaoxc',
    };
  }

  _createClass(
    _temporalAssertDefined(UserProxy, 'UserProxy', _temporalUndefined) &&
      UserProxy,
    [
      {
        key: 'getUser',
        value: function getUser() {
          return this.user;
        },
      },
    ]
  );

  return (
    _temporalAssertDefined(UserProxy, 'UserProxy', _temporalUndefined) &&
    UserProxy
  );
})();

module.exports =
  _temporalAssertDefined(UserProxy, 'UserProxy', _temporalUndefined) &&
  UserProxy;
