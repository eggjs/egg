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

  async renderString() {}
}

module.exports = NunjucksView;
