'use strict';

const nodeVersion = Number(process.version.match(/^v(\d+\.\d+)\./)[1]);
// only node >= 7.6 supports async function without flags
if (nodeVersion >= 7.6) {
  require('./_async');
}
