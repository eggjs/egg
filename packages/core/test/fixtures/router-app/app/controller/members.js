'use strict';

// 测试 app.resources 遇到 controller 没有足够的 action 的场景

exports.index = async function () {
  this.body = 'index';
};

exports.new = async function () {
  this.body = 'new';
};

exports.show = async function () {
  this.body = 'show - ' + this.params.id;
};

exports.delete = async function () {
  this.body = `delete - ${this.params.id}`;
};
