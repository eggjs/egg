exports.get = function () {
  this.set('x-request-url', this.url);
  this.body = this.user;
};

exports.post = function () {
  this.body = {
    user: this.user,
    params: this.request.body,
  };
};
