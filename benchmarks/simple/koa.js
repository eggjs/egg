'use strict';

const koa = require('koa');

const app = koa();
let n = 10;

while (n--) {
  app.use(function* (next) {
    yield next;
  });
}

app.use(function* () {
  this.body = 'Hello World, koa';
});

console.log('koa app listen on 7002');
app.listen(7002);
