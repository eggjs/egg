'use strict';

const sleep = require('mz-modules/sleep');

class NunjucksView {
  * render(filename, locals, options) {
    yield sleep(10);
    return {
      filename,
      locals,
      options,
      type: 'nunjucks',
    };
  }

  * renderString() {}
}

module.exports = NunjucksView;
