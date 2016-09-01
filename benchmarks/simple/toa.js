'use strict';

const toa = require('toa');
const Router = require('toa-router');

const router = new Router();
const app = toa();
let n = 15;

while (n--) {
  app.use(function* (next) {
    yield next;
  });
}

router.get('/', function* () {
  this.body = 'Hello World, toa';
});

app.use(router.toThunk());
console.log('toa app listen on 7003');
app.listen(7003);
