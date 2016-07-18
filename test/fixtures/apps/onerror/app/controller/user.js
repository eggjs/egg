module.exports = function* () {
  var err = new Error('test error');
  if (this.query.status) {
    err.status = Number(this.query.status)
  }
  if(this.query.errors) {
    err.errors = this.query.errors
  }
  throw err;
}