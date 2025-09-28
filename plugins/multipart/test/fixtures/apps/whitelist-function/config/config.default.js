'use strict';

exports.multipart = {
  fileExtensions: ['.foo'],
  whitelist(filename) {
    if (filename === 'bar') return true;
    if (filename === 'error') throw new Error('mock checkExt error');
    return false;
  },
};

exports.keys = 'multipart';
