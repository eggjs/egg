module.exports = function* () {
  this.body = {
    user: yield this.service.user.get('123'),
  };
};
