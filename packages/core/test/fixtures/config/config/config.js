'use strict';

exports.loader = {
  service: { ignore: 'util/**' },
  controller: { ignore: 'util/**' },
};

exports.name = 'config-test';

exports.test = 1;

exports.urllib = {
  keepAlive: false,
};
