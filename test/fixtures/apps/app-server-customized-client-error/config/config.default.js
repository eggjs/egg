'use strict';

const sleep = require('mz-modules/sleep');

exports.keys = 'my keys';

let times = 0;
exports.onClientError = async (err, socket, app) => {
  app.logger.error(err);
  await sleep(50);

  times++;
  if (times === 2) times = 0;
  if (!times) throw new Error('test throw');

  return {
    body: err.rawPacket,
    headers: { foo: 'bar' },
    status: 418,
  };
};
