const { scheduler } = require('node:timers/promises');

class NunjucksView {
  async render(filename, locals, options) {
    await scheduler.wait(10);
    return {
      filename,
      locals,
      options,
      type: 'nunjucks',
    };
  }

  async renderString(tpl, locals, options) {
    await scheduler.wait(10);
    return {
      tpl,
      locals,
      options,
      type: 'nunjucks',
    };
  }
}

module.exports = NunjucksView;
