const { scheduler } = require('node:timers/promises');

exports.keys = 'my keys';

let times = 0;
exports.onClientError = async (err, socket, app) => {
  app.logger.error(err);
  await scheduler.wait(50);

  times++;
  if (times === 2) times = 0;
  if (!times) throw new Error('test throw');

  return {
    body: err.rawPacket,
    headers: { foo: 'bar', 'Content-Length': 100 },
    status: 418,
  };
};
