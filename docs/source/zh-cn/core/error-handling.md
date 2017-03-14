title: 异常处理
---

## 异常捕获

得益于框架底层采用的 co 库将异步编码变成了同步模型，同时错误也完全可以用 `try catch` 来捕获。在编写应用代码时，所有地方都可以直接用 `try catch` 来捕获异常。

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

按照正常代码写法，所有的异常都可以用这个方式进行捕获并处理，但是一定要注意一些特殊的写法可能带来的问题。打一个不太正式的比方，我们的代码全部都在一个异步调用链上，所有的异步操作都通过 yield 串接起来了，但是只要有一个地方跳出了异步调用链，异常就捕获不到了。

```js
// app/controller/jump.js
exports.buy = function* (ctx) {
  const request = {};
  const config = yield ctx.service.trade.buy(request);
  // 下单后需要进行一次核对，且不阻塞当前请求
  setImmediate(() => {
    ctx.service.trade.check(request).catch(err => ctx.logger.error(err));
  });
}
```

在这个场景中，如果 `service.trade.check` 方法中代码有问题，导致执行时抛出了异常，尽管框架会在最外层通过 `try catch` 统一捕获错误，但是由于 `setImmediate` 中的代码『跳出』了异步链，它里面的错误就无法被捕捉到了。因此在编写类似代码的时候一定要注意。

当然，框架也考虑到了这类场景，提供了 `ctx.runInBackground(scope)` 辅助方法，通过它又包装了一个异步链，所有在这个 scope 里面的错误都会统一捕获。

```js
exports.buy = function* (ctx) {
  const request = {};
  const config = yield ctx.service.trade.buy(request);
  // 下单后需要进行一次核对，且不阻塞当前请求
  ctx.runInBackground(function* () {
    // 这里面的异常都会统统被 Backgroud 捕获掉，并打印错误日志
    yield ctx.service.trade.check(request);
  });
}
```

**为了保证异常可追踪，必须保证所有抛出的异常都是 Error 类型，因为只有 Error 类型才会带上堆栈信息，定位到问题。**

## 框架层统一异常处理

框架通过 [onerror](https://github.com/eggjs/egg-onerror) 插件提供了统一的错误处理机制。对一个请求的所有处理方法（Middleware、Controller、Service）中抛出的任何异常都会被它捕获，并自动根据请求想要获取的类型返回不同类型的错误（基于 [Content Negotiation](https://tools.ietf.org/html/rfc7231#section-5.3.2)）。

| 请求需求的格式 | 环境 | errorPageUrl 是否配置 | 返回内容 |
|-------------|------|----------------------|--------|
| HTML & TEXT | local & unittest | - | onerror 自带的错误页面，展示详细的错误信息 |
| HTML & TEXT | 其他 | 是 | 重定向到 errorPageUrl |
| HTML & TEXT | 其他 | 否 | onerror 自带的没有错误信息的简单错误页（不推荐） |
| JSON | local & unittest | - | JSON 对象，带详细的错误信息 |
| JSON | 其他 | - | json 对象，不带详细的错误信息 |

### errorPageUrl

onerror 插件的配置中支持 errorPageUrl 属性，当配置了 errorPageUrl 时，一旦用户请求线上应用的 HTML 页面异常，就会重定向到这个地址。

在 `config/config.default.js` 中

```js
// config/config.default.js
module.exports = {
  onerror: {
    // 线上页面发生异常时，重定向到这个页面上
    errorPageUrl: '/50x.html',
  },
};
```

## 自定义统一异常处理

尽管框架提供了默认的统一异常处理机制，但是应用开发中经常需要对异常时的响应做自定义，特别是在做一些接口开发的时候。这时我们可以通过自定义[中间件](../basics/middleware.md)的方式来自行定义统一的异常处理函数。

例如我们可以在 `app/middleware` 中新增一个 `error_handler.js` 的文件

```js
// app/middleware/error_handler.js
module.exports = () => {
  return function* errorHandler(next) {
    try {
      yield next;
    } catch (err) {
      // 注意：自定义的错误统一处理函数捕捉到错误后也要 `app.emit('error', err, this)`
      // 框架会统一监听，并打印对应的错误日志
      this.app.emit('error', err, this);
      // 自定义错误时异常返回的格式
      this.body = {
        success: false,
        message: this.app.config.env === 'prod' ? 'Internal Server Error' : err.message,
      };
    }
  };
};
```

然后在 `config/config.default.js` 中引入这个中间件

```js
module.exports = {
  middleware: [ 'errorHandler' ],
  errorHandler: {
    // 非 `/api/` 路径不在这里做错误处理，留给默认的 onerror 插件统一处理
    match: '/api',
  },
};
```

## 404

框架并不会将服务端返回的 404 状态当做异常来处理，但是框架提供了当响应为 404 且没有返回 body 时的默认响应。

- 当请求被框架判定为需要 JSON 格式的响应时，会返回一段 JSON：

  ```json
  { "message": "Not Found" }
  ```

- 当请求被框架判定为需要 HTML 格式的响应时，会返回一段 HTML：

  ```html
  <h1>404 Not Found</h1>
  ```

框架支持通过配置，将默认的 HTML 请求的 404 响应重定向到指定的页面。

```js
// config/config.default.js
module.exports = {
  notfound: {
    pageUrl: '/404.html',
  },
};
```

### 自定义 404 响应

在一些场景下，我们需要自定义服务器 404 时的响应，和自定义异常处理一样，我们也只需要加入一个中间件即可对 404 做统一处理：

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

在配置中引入中间件：

```js
// config/config.default.js
module.exports = {
  middleware: [ 'notfoundHander' ],
};
```
