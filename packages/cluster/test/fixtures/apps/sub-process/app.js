'use strict';

const { fork } = require('child_process');
const path = require('path');

module.exports = () => {
  fork(path.join(__dirname, 'worker1.js'));
  fork(path.join(__dirname, 'worker2.js'));
};
