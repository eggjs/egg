'use strict';

exports.schedule = {
  type: 'worker',
  interval: 1000000,
};

exports.task = async (ctx) => {
  await Promise.resolve();
  ctx.app.scheduleExecuted = true;
};
