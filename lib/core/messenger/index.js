'use strict';

const LocalMessenger = require('./local');
const IPCMessenger = require('./ipc');

exports.create = egg => {
  return egg.options.mode === 'single'
    ? new LocalMessenger(egg)
    : new IPCMessenger(egg);
};
