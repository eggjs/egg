module.exports = function* () {
  this.body = {
    query: this.query,
    queries: this.queries,
  };
};
