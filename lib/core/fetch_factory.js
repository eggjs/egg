const debug = require('util').debuglog('egg:lib:core:httpclient_next');

const mainNodejsVersion = parseInt(process.versions.node.split('.')[0]);
let FetchFactory;
if (mainNodejsVersion >= 18) {
  // urllib@4 only works on Node.js >= 18
  try {
    const urllib4 = require('urllib4');
    FetchFactory = urllib4.FetchFactory;
    debug('urllib4 enable');
  } catch (err) {
    debug('require urllib4 error: %s', err);
  }
}

module.exports = FetchFactory;
