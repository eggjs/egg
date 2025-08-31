'use strict';

exports.index = async function () {
  this.body = 'index';
};

exports.new = async function () {
  this.body = 'new';
};

exports.create = async function () {
  this.body = 'create';
};

exports.show = async function () {
  this.body = 'show - ' + this.params.id;
};

exports.edit = async function () {
  this.body = 'edit - ' + this.params.id;
};

exports.update = async function () {
  this.body = 'update - ' + this.params.id;
};

exports.destroy = async function () {
  this.body = 'destroy - ' + this.params.id;
};
