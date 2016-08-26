'use strict';

const koa = require('koa');

const koaApp = koa();
let n = 10;

while (n--) {
  koaApp.use(function* (next) {
    yield next;
  });
}

koaApp.use(function* (next) {
  yield next;
  this.body = 'Hello World, koa';
});

console.log('koa app listen on 7002');
koaApp.listen(7002);
