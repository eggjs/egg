'use strict';

const path = require('path');

exports.tracelog = {
  enable: true,
  path: path.join(__dirname, '../plugin/tracelog'),
};

exports.gateway = {
  enable: true,
  path: path.join(__dirname, '../plugin/gateway'),
};

exports.rpcServer = {
  enable: false,
  path: path.join(__dirname, '../plugin/rpc_server'),
};

exports.ldc = {
  enable: true,
  path: path.join(__dirname, '../plugin/ldc'),
};

exports.zoneclient = {
  enable: false,
  path: path.join(__dirname, '../plugin/zoneclient'),
};
