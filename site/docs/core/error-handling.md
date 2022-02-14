---
title: Exception Handling
order: 9
---

## Exception Capture

Taking benefits from framework asynchronous support, all exceptions can be caught by `try catch`.

With those features, you can take following implementation as reference:

```js
// app/service/test.js
try {
  const res = await this.ctx.curl('http://eggjs.com/api/echo', {
    dataType: 'json',
  });
  if (res.status !== 200) throw new Error('response status is not 200');
  return res.data;
} catch (err) {
  this.logger.error(err);
  return {};
}
```

Generally, you can use `try catch` to catch exceptions. However, some implementations may break this mechanism down. Imaging that `await` makes generators run in order just like a chain. What will happen if one of them jumpoff the chain? The following code can help you realize the imagination:

```js
// app/controller/home.js
class HomeController extends Controller {
  async buy() {
    const request = {};
    const config = await ctx.service.trade.buy(request);
    // checking the deal and don't block current request
    setImmediate(() => {
      ctx.service.trade.check(request).catch((err) => ctx.logger.error(err));
    });
  }
}
```

In this case, you may find that the exceptions in `setImmediate` will be swallowed because the scope breaks the chain, although egg already handled exceptions externally.

Above scene is also considered. To catch the exception inside the scope, You can invoke helper method `ctx.runInBackground(scope)` to wrap the chain back. Now, the exceptions will be detected and caught.

```js
class HomeController extends Controller {
  async buy() {
    const request = {};
    const config = await ctx.service.trade.buy(request);
    // checking the deal and don't block current request
    ctx.runInBackground(async () => {
      // Exceptions thrown here will be caught in background and printed into log.
      await ctx.service.trade.check(request);
    });
  }
}
```

For convenience of locating problems, exceptions must be guaranteed to be Error object or object based on Error object, which offers a trace of which functions were called.

## Egg Takes Charge of Exceptions

[egg-onerror](https://github.com/eggjs/egg-onerror), one of Egg's plugin, handles all exceptions thrown in Middleware, Controller and Service, and returns the error as response based on "Accept" in request header field.

| Accept       | ENV              | errorPageUrl | response                                             |
| ------------ | ---------------- | ------------ | ---------------------------------------------------- |
| HTML & TEXT  | local & unittest | -            | onerror built-in error page                          |
| HTML & TEXT  | others           | YES          | redirect to errorPageUrl                             |
| HTML & TEXT  | others           | NO           | onerror built-in error page(simple, not recommended) |
| JSON & JSONP | local & unittest | -            | JSON Object or JSONP response body with details      |
| JSON & JSONP | others           | -            | JSON object or JSONP response body without details   |

### `errorPageUrl`

Redirecting to your customized error page by setting `errorPageUrl` in `onerror` plugin.

`onerror` config in `config/config.default.js`:

```js
module.exports = {
  onerror: {
    errorPageUrl: '/50x.html',
  },
};
```

## Create Your Universal Exception Handler

Once the default handler no longer meet your needs, you still can customize your owner error handler by onerror's configurations.

```js
// config/config.default.js
module.exports = {
  onerror: {
    all(err, ctx) {
      // Define an error handler for all type of Response.
      // Once config.all present, other type of error handers will be ignored.
      ctx.body = 'error';
      ctx.status = 500;
    },
    html(err, ctx) {
      // html hander
      ctx.body = '<h3>error</h3>';
      ctx.status = 500;
    },
    json(err, ctx) {
      // json hander
      ctx.body = { message: 'error' };
      ctx.status = 500;
    },
    jsonp(err, ctx) {
      // Generally, we don't need to customize jsonp error handler.
      // It will call json error handler and wrap to jsonp type response.
  },
};
```

## 404

Egg won't take `NOT FOUND` from back-end as exception. Instead, if `NOT FOUND` is emitted without a body, it will return the following JSON object as default response.

identified as JSON:

```js
{
  "message": "Not Found"
}
```

identified as HTML:

```html
<h1>404 Not Found</h1>
```

Overriding default 404 page to the one you want:

```js
// config/config.default.js
module.exports = {
  notfound: {
    pageUrl: '/404.html',
  },
};
```

### Customize 404 Response

If you want a customized 404 response, you only need to create a middleware to handle it once, just like handling exceptions above.

```js
// app/middleware/notfound_handler.js
module.exports = () => {
  return async function notFoundHandler(ctx, next) {
    await next();
    if (ctx.status === 404 && !ctx.body) {
      if (ctx.acceptJSON) {
        ctx.body = { error: 'Not Found' };
      } else {
        ctx.body = '<h1>Page Not Found</h1>';
      }
    }
  };
};
```

Adding yours to `middleware` in config:

```js
// config/config.default.js
module.exports = {
  middleware: ['notfoundHandler'],
};
```
