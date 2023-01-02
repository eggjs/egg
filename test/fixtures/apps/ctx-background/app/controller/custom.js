const fs = require('fs/promises');

module.exports = async ctx => {
  ctx.body = 'hello';
  const fn = async function saveUserInfo(ctx) {
    const buf = await fs.readFile(__filename);
    ctx.logger.warn('background run result file size: %s', buf.length);
  };
  fn._name = 'customTaskName';
  ctx.runInBackground(fn);
};
