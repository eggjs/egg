'use strict';

const koa = require('koa');
const nunjucks = require('nunjucks');
const path = require('path');

const koaApp = koa();
let n = 10;

while (n--) {
  koaApp.use(function* (next) {
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

koaApp.use(function* (next) {
  yield next;
  this.body = yield render('home.html', {
    user: {
      name: 'fookoa',
    },
    title: 'koa view example',
  });
});

console.log('koa app listen on 7002');
koaApp.listen(7002);
