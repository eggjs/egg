'use strict';

module.exports = {
  appResponse: 'app response',
  overridePlugin: 'will override plugin',

  set status(code) {
    this._explicitStatus = true;
    this.res.statusCode = code;
    this.res.statusMessage = 'http status code ' + code;
  },

  get etag() {
    return 'etag ok';
  },
};
