'use strict';

const fs = require('fs');
const path = require('path');

exports.security = {
  csrf: false,
};

exports.siteFile = {
  '/robots.txt': fs.readFileSync(path.join(__dirname, '../app/robots.txt')),
  '/crossdomain.xml': fs.readFileSync(path.join(__dirname, '../app/crossdomain.xml')),
  '/fake.txt': 123, // wrong config
};

exports.keys = 'foo';
