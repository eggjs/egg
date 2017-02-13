'use strict';

module.exports = options => {
  return function* notfound(next) {
    yield next;

    if (this.status !== 404 || this.body) {
      return;
    }

    // set status first, make sure set body not set status
    this.status = 404;

    if (this.acceptJSON) {
      this.body = {
        message: 'Not Found',
      };
      return;
    }

    if (options.pageUrl) {
      this.realStatus = 404;
      this.redirect(options.pageUrl);
      return;
    }
    this.body = '<h1>404 Not Found</h1>';
  };
};
