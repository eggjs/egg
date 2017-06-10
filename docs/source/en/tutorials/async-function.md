title: Development with Async Function
---

[Previous chapter](../intro/egg-and-koa.md#async-function) introduces [async function] is a js language level's syntax that providing asynchronous solutions，and Node.js will upgrade v8 to version 5.5 since 7.6.0, then async function don't need to be enabled by flag. Framework default support async function，and can use async function to replace generator function.

**Note：When writing async function，make sure you are running on Node.js 7.6+.**

## Controller & Service

In [controller]，there are two mothods to write a controller：Controller Class and Method. Any implementations using generator function can use async function instead without logic change，just modify yield syntax to await.
Also in [service] and [controller]，all async function can use async function to replace generator function。

For example, replacing codes in the [controller] with async function：

```js
// app/controller/post.js
module.exports = app => {
  class PostController extends app.Controller {
    // replace * create() with async create()
    async create() {
      const { ctx, service } = this;
      const createRule = {
        title: { type: 'string' },
        content: { type: 'string' },
      };
      // vaildate parameters
      ctx.validate(createRule);
      // assemble parameters
      const author = ctx.session.userId;
      const req = Object.assign(ctx.request.body, { author });
      // call service to handle business 
      // replace yield with await
      const res = await service.post.create(req);
      // set response content and status code
      ctx.body = { id: res.id };
      ctx.status = 201;
    }
  }

  return PostController;
}
```

**Note： Using await to call `service.post.create()`  in the contorller, it might need be called after adjusting `service.post.create()` to async function if `service.post.create()` also use generator function**

## Schedule

[Schedule] also support async function，tasks need to follow the rules above to replace generator function with async function.

```js
module.exports = {
  // config the schedule tasks throught the attributes of schedule
  schedule: {
    interval: '1m', // 1 minute interval
    type: 'all', // assign all workers are needed to execute
  },
  // task is the function that running within schedule taks, first parameter is instance of anonymous ctx
  async task(ctx) {
    const res = await ctx.curl('http://www.api.com/cache', {
      dataType: 'json',
    });
    ctx.app.cache = res.data;
  },
};
```

## Middleware

All middlewares，including [Standard](../basics/middleware.md) and [Using Middleware in Router](../basics/router.md#Using Middleware) can be writeen with async function, but argument lists changed comparing to the middleware in generator function, similar to Koa v2.x：

- first parameter `ctx`，the request context，instance of [Context](../basics/extend.md#Context) .
- second parameter `next`，use await to execute the logic of middleware.

```js
// app/middleware/gzip.js

const isJSON = require('koa-is-json');
const zlib = require('zlib');

module.exports = (options, app) => {
  return async function gzip(ctx, next) {
    // next is a method and need to call comparing to the middleware with the generator function
    await next();

    // completed executing middleware then compress the response body to gzip
    const body = ctx.body;
    if（!body) return;

    // support options.threshold
    if (options.threshold && ctx.length < options.threshold) return;

    if (isJSON(body)) body = JSON.stringify(body);

    // set gzip body and revise the response header
    ctx.body = zlib.createGzip().end(body);
    ctx.set('Content-Encoding', 'gzip');
  };
};
```

## Call generator function API

Since some plugins providing the API of generator function that we cannot call async function using await directly. We can use [co] to provide a wrap method to wrap them to return a Promise then can be used in async function.

```js
const co = require('co');
app.mysql.query = co.wrap(app.mysql.query);
// need to bind this as app.mysql if want to use query directly
const query = co.wrap(app.mysql.query).bind(app.mysql);

// can use async function after wrapping
async function getUser() {
  // return await app.mysql.query();
  return await query();
}
```

## Slight of Difference with Generator Function

While both functions are exactly the same models, but [co] has some speical handling such as supporting yield  an array (object), which are not native in the async function. But you can easily implement these functions based on some Promise libraries and methods. 

- generator function

  ```js
  function* () {
    const tasks = [ task(1), task(2), task(3) ];
    let results;
    // concurrency
    results = yield tasks;
    // set max concurrent as 2 
    result = yield require('co-parallel')(tasks, 2);
  }
  ```

- async function

  ```js
  async () => {
    const tasks = [ task(1), task(2), task(3) ];
    let results;
    // concurrency
    results = await Promise.all(tasks);
    // set max concurrent as 2 
    results = await require('p-all')(tasks, { concurrency: 2} );
  }
  ```

@sindresorhus writing lots of [helpers based on promise](https://github.com/sindresorhus/promise-fun)，flexible use with async function can make code more readable.

----

Full examples refer to  [examples/hackernews-async](https://github.com/eggjs/examples/tree/master/hackernews-async).

[async function]: https://github.com/tc39/ecmascript-asyncawait
[co]: https://github.com/tj/co
[controller]: ../basics/controller.md
[service]: ../basics/service.md
[schedule]: ../basics/schedule.md
