'use strict';

const toa = require('toa');

const app = toa();
let n = 10;

while (n--) {
  app.use(function* (next) {
    yield next;
  });
}

app.use(function* () {
  this.body = 'Hello World, toa';
});

console.log('toa app listen on 7003');
app.listen(7003);
