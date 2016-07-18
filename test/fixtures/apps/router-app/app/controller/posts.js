'use strict';

exports.index = function* () {
  this.body = 'index';
};

exports.new = function* () {
  this.body = 'new';
};

exports.create = function* () {
  this.body = 'create';
};

exports.show = function* () {
  this.body = 'show - ' + this.params.id;
};

exports.edit = function* () {
  this.body = 'edit - ' + this.params.id;
};

exports.update = function* () {
  this.body = 'update - ' + this.params.id;
};

exports.destroy = function* () {
  this.body = 'destroy - ' + this.params.id;
};