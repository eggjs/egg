exports.get = async function() {
  this.body = this.user;
};

exports.post = async function() {
  this.body = {
    user: this.user,
    params: this.request.body,
  };
};
