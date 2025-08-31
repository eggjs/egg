'use strict';

const path = require('path');

exports.tracelog = {
  enable: true,
  path: path.join(__dirname, '../plugin/tracelog'),
};

exports.rpcServer = {
  enable: false,
  path: path.join(__dirname, '../plugin/rpc-server'),
};

exports.gw = {
  enable: false,
  path: path.join(__dirname, '../plugin/gw'),
};
