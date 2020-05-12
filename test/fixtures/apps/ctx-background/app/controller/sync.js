'use strict';

module.exports = async ctx => {
  const start = Date.now();
  ctx.runInBackground(async () => {
    const start = Date.now();
    while(Date.now() - start < 100) {
    }
  });
  ctx.body = Date.now() - start;
};
