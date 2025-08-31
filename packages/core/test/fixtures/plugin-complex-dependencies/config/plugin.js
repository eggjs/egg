'use strict';

const path = require('path');

exports.rpc = {
  enable: true,
  path: path.join(__dirname, '../plugin/rpc'),
};

exports.ldc = {
  enable: true,
  path: path.join(__dirname, '../plugin/ldc'),
};

exports.zoneclient = {
  enable: true,
  path: path.join(__dirname, '../plugin/zoneclient'),
};

exports.zookeeper = {
  enable: true,
  path: path.join(__dirname, '../plugin/zookeeper'),
};

exports.vip = {
  enable: true,
  path: path.join(__dirname, '../plugin/vip'),
};

exports.ddcs = {
  enable: true,
  path: path.join(__dirname, '../plugin/ddcs'),
};
