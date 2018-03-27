'use strict';

const sleep = require('mz-modules/sleep');

exports.keys = 'my keys';

exports.onClientError = async (err, socket, app) => {
  app.logger.error(err);
  await sleep(50);
  return {
    body: err.rawPacket,
    headers: { foo: 'bar' },
    status: 418,
  };
};
