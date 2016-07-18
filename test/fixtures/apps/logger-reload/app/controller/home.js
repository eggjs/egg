module.exports = function*() {
  this.logger.warn('%s %s', this.method, this.path);
  this.logger.error(new Error('error'));
  this.body = {
    method: this.method,
    path: this.path,
  };
};
