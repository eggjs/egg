const { scheduler } = require('node:timers/promises');

class AsyncView {
  render(filename, locals, options) {
    const ret = {
      filename,
      locals,
      options,
      type: 'async',
    };
    return scheduler.wait(10).then(() => ret);
  }

  renderString(tpl, locals, options) {
    const ret = {
      tpl,
      locals,
      options,
      type: 'async',
    };
    return scheduler.wait(10).then(() => ret);
  }
}

module.exports = AsyncView;
