'use strict';

const toa = require('toa');
const nunjucks = require('nunjucks');
const path = require('path');
const Router = require('toa-router');

const router = new Router();
const app = toa();
let n = 15;

while (n--) {
  app.use(function* (next) {
    yield next;
  });
}

const options = {
  noCache: false,
};
const viewPaths = path.join(__dirname, 'app/view');
const engine = new nunjucks.Environment(new nunjucks.FileSystemLoader(viewPaths, options), options);

function render(name, locals) {
  return new Promise((resolve, reject) => {
    engine.render(name, locals, function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

router.get('/', function* () {
  this.body = yield render('home.html', {
    user: {
      name: 'footoa',
    },
    title: 'toa view example',
  });
});

app.use(router.toThunk());
console.log('toa app listen on 7003');
app.listen(7003);
