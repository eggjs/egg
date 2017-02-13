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

    const notFoundHtml = '<h1>404 Not Found</h1>';

    // notfound handler is unimplemented
    if (options.pageUrl && this.path === options.pageUrl) {
      this.body = `${notFoundHtml}<p><pre><code>config.notfound.pageUrl(${options.pageUrl})</code></pre> is unimplemented</p>`;
      return;
    }

    if (options.pageUrl) {
      this.realStatus = 404;
      this.redirect(options.pageUrl);
      return;
    }
    this.body = notFoundHtml;
  };
};
