exports.home = function*() {
  if (this.query.cookiedel) {
    if (!this.query.opts) {
      this.deleteCookie('cookiedel');
    } else {
      const options = {
        path: '/hello',
        domain: 'eggjs.org',
      };
      this.deleteCookie('cookiedel', options);
    }
  }

  if (this.query.hasOwnProperty('cookiepath')) {
    const opts = {
      path: this.query.cookiepath,
    };
    if (this.query.cookiedomain) {
      opts.domain = this.query.cookiedomain;
    }
    this.setCookie('cookiepath', this.query.cookiepath, opts);
  }
  if (this.query.notSetPath) {
    this.setCookie('notSetPath', this.query.notSetPath, {
      path: null,
      domain: null,
    });
  }
  this.body = 'hello mock secure app';
};

exports.getUser = function*() {
  this.jsonp = { name: 'fengmk2' };
};
