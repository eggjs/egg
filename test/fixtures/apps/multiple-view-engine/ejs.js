const { scheduler } = require('node:timers/promises');

class EjsView {
  async render(filename, locals, options) {
    await scheduler.wait(10);
    return {
      filename,
      locals,
      options,
      type: 'ejs',
    };
  }

  async renderString(tpl, locals, options) {
    await scheduler.wait(10);
    return {
      tpl,
      locals,
      options,
      type: 'ejs',
    };
  }
}

module.exports = EjsView;
