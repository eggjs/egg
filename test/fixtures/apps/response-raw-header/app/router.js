'use strict';

module.exports = function(app) {
  app.get('/', function*() {
    this.body = 'hello';
    this.setRawHeader('foo', 'bar');
    this.setRawHeader('bar', [ 'foo', 'bar' ]);
    this.setRawHeader('Foo-Bar', ['Foo', 'Bar']);
  });
};
