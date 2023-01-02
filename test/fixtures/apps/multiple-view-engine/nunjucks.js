const { sleep } = require('../../../utils');

class NunjucksView {
  async render(filename, locals, options) {
    await sleep(10);
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
