'use strict';

const path = require('path');

exports.keys = 'foo';

exports.logger = {
  dir: path.join(__dirname, '../logs'),
};

exports.alinode = {
  enable: !!process.env.ALINODE_ENABLE,
  appid: process.env.ALINODE_APPID,
  server: process.env.ALINODE_SERVER,
  secret: process.env.ALINODE_SECRET,
};
