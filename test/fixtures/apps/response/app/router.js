'use strict';

const assert = require('assert');

module.exports = app => {
  app.get('/', function* () {
      this.body = 'hello';
      assert.equal(this.response.length, 5);
      this.body = Buffer.alloc(3);
      assert.equal(this.response.length, 3);
      this.body = {};
      assert.equal(this.response.length, 2);
      this.body = 'ok';
      this.type = 'text';
      this.response.type = 'plain/text';
  });
}
