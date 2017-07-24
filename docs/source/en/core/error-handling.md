title: Exception Handling
---

## Exception Capture

Taking benefits from [co](https://github.com/tj/co) library, Egg easily transforms asynchronous to synchronous. In the meantime, all exceptions can be caught by `try catch`.

With those features, you can take following implementation as reference:

```js
// app/service/test.js
try {
  const res = yield this.ctx.curl('http://eggjs.com/api/echo', { dataType: 'json' });
  if (res.status !== 200) throw new Error('response status is not 200');
  return res.data;
} catch (err) {
  this.logger.error(err);
  return {};
}
```

Generally, you can use `try catch` to catch exceptions. However, some implementations may break this mechanism down. Imaging that `yield` makes generators run in order just like a chain. What will happen if one of them jumpoff the chain? The following code can help you realize the imagination:

```js
// app/controller/jump.js
exports.buy = function* (ctx) {
  const request = {};
  const config = yield ctx.service.trade.buy(request);
  // checking the deal and don't block current request
  setImmediate(() => {
    ctx.service.trade.check(request).catch(err => ctx.logger.error(err));
  });
}
```

In this case, you may find that the exceptions in `setImmediate` will be swallowed because the scope breaks the chain, although egg already handled exceptions externally.

Above scene is also considered. To catch the exception inside the scope, You can invoke helper method `ctx.runInBackground(scope)` to wrap the chain back. Now, the exceptions will be detected and caught.

```js
exports.buy = function* (ctx) {
  const request = {};
  const config = yield ctx.service.trade.buy(request);
  ctx.runInBackground(function* () {
    // Exceptions thrown here will be caught in background and printed into log.
    yield ctx.service.trade.check(request);
  });
}
```

For convenience of locating problems, exceptions must be guaranteed to be Error object or object based on Error object, which offers a trace of which functions were called.

## Egg takes charge of exceptions

[egg-onerror](https://github.com/eggjs/egg-onerror), one of Egg's plugin, handles all exceptions thrown in Middleware, Controller and Service, and returns the error as response based on "Accept" in request header field.

| Accept | ENV | errorPageUrl | response |
|-------------|------|----------------------|--------|
| HTML & TEXT | local & unittest | - | onerror built-in error page |
| HTML & TEXT | others | YES | redirect to errorPageUrl |
| HTML & TEXT | others | NO | onerror built-in error page(simple, not recommended) |
| JSON | local & unittest | - | JSON Object with details |
| JSON | others | - | JSON object without details |

### errorPageUrl

Redirecting to your customized error page by setting `errorPageUrl` in `onerror` plugin.

`onerror` config in `config/config.default.js`:

```js
module.exports = {
  onerror: {
    errorPageUrl: '/50x.html',
  },
};
```

## Create your universal exception handler

Once the default handler no longer meet your needs, you still can leverage Middleware to create a new handler.

As following implementation, you can create a new file in `app/middleware`, for example `error_handler.js`:

```js
// app/middleware/error_handler.js
module.exports = () => {
  return function* errorHandler(next) {
    try {
      yield next;
    } catch (err) {
      // `app.emit('error', err, this)` should be invoked after exceptions are caught
      // Exceptions will be caught and printed out.
      this.app.emit('error', err, this);
      // Composing the object in handler when exceptions are thrown
      this.body = {
        success: false,
        message: this.app.config.env === 'prod' ? 'Internal Server Error' : err.message,
      };
    }
  };
};
```

Adding your customized `error_handler` in `config/config.default.js`:

```js
module.exports = {
  middleware: [ 'errorHandler' ],
  errorHandler: {
    // errorHandler only handle exceptions from requests under /api/, and onerror will do the same things for the rest.
    match: '/api',
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
  return function* (next) {
    yield next;
    if (this.status === 404 && !this.body) {
      if (this.acceptJSON) this.body = { error: 'Not Found' };
      else this.body = '<h1>Page Not Found</h1>';
    }
  };
};
```

Adding yours to `middleware` in config:

```js
// config/config.default.js
module.exports = {
  middleware: [ 'notfoundHander' ],
};
```