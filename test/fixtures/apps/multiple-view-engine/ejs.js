'use strict';

const sleep = require('mz-modules/sleep');

class EjsView {
  * render(filename, locals, options) {
    yield sleep(10);
    return {
      filename,
      locals,
      options,
      type: 'ejs',
    };
  }

  * renderString(tpl, locals, options) {
    yield sleep(10);
    return {
      tpl,
      locals,
      options,
      type: 'ejs',
    };
  }
}

module.exports = EjsView;
