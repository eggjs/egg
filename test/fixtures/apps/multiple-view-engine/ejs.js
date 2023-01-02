const { sleep } = require('../../../utils');

class EjsView {
  async render(filename, locals, options) {
    await sleep(10);
    return {
      filename,
      locals,
      options,
      type: 'ejs',
    };
  }

  async renderString(tpl, locals, options) {
    await sleep(10);
    return {
      tpl,
      locals,
      options,
      type: 'ejs',
    };
  }
}

module.exports = EjsView;
