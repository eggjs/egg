const assert = require('assert');

module.exports = app => {
  app.get('/', async function () {
    assert.equal(this.traceId, this.traceId);
    this.set('x-trace-id', this.traceId);
    this.body = 'hi, egg';
  });
};
