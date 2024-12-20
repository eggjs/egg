module.exports = async function () {
  this.body = {
    query: this.query,
    queries: this.queries,
  };
};
