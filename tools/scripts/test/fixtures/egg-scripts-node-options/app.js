'use strict';

module.exports = () => {
  console.log('process.execArgv:', process.execArgv);
  console.log('maxHeaderSize:', require('http').maxHeaderSize);
};
