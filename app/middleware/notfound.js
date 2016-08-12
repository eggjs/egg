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

    if (options.enableRedirect && options.pageUrl) {
      this.realStatus = 404;
      this.redirect(options.pageUrl);
      return;
    }
    const title = '<h1>404 Not Found</h1>';
    if (!options.enableRedirect && options.pageUrl) {
      this.body = `${title}Because you are in a non-prod environment, you will be looking at this page, otherwise it will jump to ${options.pageUrl}`;
    } else {
      this.body = title;
    }

  };
};
