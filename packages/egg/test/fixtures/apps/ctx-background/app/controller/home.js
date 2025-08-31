const fs = require('fs/promises');

module.exports = async function() {
  this.body = 'hello';
  this.runInBackground(async function saveUserInfo(ctx) {
    const buf = await fs.readFile(__filename);
    ctx.logger.warn('background run result file size: %s', buf.length);
  });
  this.runInBackground(async ctx => {
    const buf = await fs.readFile(__filename);
    ctx.logger.warn('mock background run anonymous result file size: %s', buf.length);
  });
};
