'use strict';

// 测试 app.resources 遇到 controller 没有足够的 action 的场景

exports.index = function* () {
  this.body = 'index';
};

exports.new = function* () {
  this.body = 'new';
};

exports.show = function* () {
  this.body = 'show - ' + this.params.id;
};