exports.home = function*() {
  if (this.query.cookiedel) {
    if (!this.query.opts) {
      this.cookies.set('cookiedel', null);
    } else {
      const options = {
        path: '/hello',
        domain: 'eggjs.org',
      };
      this.cookies.set('cookiedel', null, options);
    }
  }
  if (this.query.setCookieValue) {
    this.cookies.set('foo-cookie', this.query.setCookieValue);
  }

  if (this.query.hasOwnProperty('cookiepath')) {
    const opts = {
      path: this.query.cookiepath,
    };
    if (this.query.cookiedomain) {
      opts.domain = this.query.cookiedomain;
    }
    this.cookies.set('cookiepath', this.query.cookiepath, opts);
  }
  if (this.query.notSetPath) {
    this.cookies.set('notSetPath', this.query.notSetPath, {
      path: null,
      domain: null,
    });
  }
  this.body = 'hello mock secure app';
};

exports.getUser = function*() {
  this.body = { name: 'fengmk2' };
};
