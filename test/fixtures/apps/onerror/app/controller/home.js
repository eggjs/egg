exports.index = function* () {
  var err = new Error('test error');
  if(this.query.code) {
    err.code = this.query.code
  }
  if (this.query.status) {
    err.status = Number(this.query.status)
  }
  throw err;
};
exports.csrf = function* () {
  this.set('x-csrf', this.csrf);
  this.body = 'test';
}
exports.test = function* () {
  var err = new SyntaxError('syntax error');
  if (this.query.status) {
    err.status = Number(this.query.status)
  }
  throw err;
}
