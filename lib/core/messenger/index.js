"use strict";

const LocalMessenger = require("./local");
const IPCMessenger = require("./ipc");

/**
 * @class Messenger
 */

/**
 * @param {Object} egg - egg application instance
 * @return {Messenger} messenger instance
 */
exports.create = (egg) => {
  return egg.options.mode === "single" ? new LocalMessenger(egg) : new IPCMessenger(egg);
};
