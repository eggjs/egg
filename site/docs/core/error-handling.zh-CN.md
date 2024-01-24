---
title: 异常处理
order: 9
---

## 异常捕获

得益于框架支持的异步编程模型，错误完全可以用 `try catch` 来捕获。在编写应用代码时，所有地方都可以直接用 `try catch` 来捕获异常。

```js
// app/service/test.js
try {
  const res = await this.ctx.curl('http://eggjs.com/api/echo', {
    dataType: 'json'
  });
  if (res.status !== 200) throw new Error('response status is not 200');
  return res.data;
} catch (err) {
  this.logger.error(err);
  return {};
}
```

按照正常代码写法，所有的异常都可以用这种方式进行捕获并处理，但是一定要注意一些特殊的写法可能带来的问题。举个不太正式的比方，我们的代码全部都在一个异步调用链上，所有的异步操作都通过 `await` 串接起来了。但是，只要有一个地方跳出了异步调用链，异常就无法被捕获。

```js
// app/controller/home.js
class HomeController extends Controller {
  async buy() {
    const request = {};
    const config = await this.ctx.service.trade.buy(request);
    // 下单后需要进行一次核对，且不阻塞当前请求
    setImmediate(() => {
      this.ctx.service.trade.check(request).catch(err => this.ctx.logger.error(err));
    });
  }
}
```

在这个场景下，如果 `service.trade.check` 的代码出现问题，导致执行时抛出异常，框架虽可以在最外层通过 `try catch` 统一捕获错误，但由于 `setImmediate` 中代码『跳出』了异步链，错误就无法被捉到了。所以开发时需要特别注意。

幸运的是，框架针对类似场景提供了 `ctx.runInBackground(scope)` 辅助方法，通过它封装了另一个异步链，所有在这个 `scope` 内的错误都会被捕获。

```js
class HomeController extends Controller {
  async buy() {
    const request = {};
    const config = await this.ctx.service.trade.buy(request);
    // 下单后需要进行一次核对，且不阻塞当前请求
    this.ctx.runInBackground(async () => {
      // 这里的异常都会被 Background 捕获，并打印错误日志
      await this.ctx.service.trade.check(request);
    });
  }
}
```

**为确保异常可追踪，所有抛出的异常必须是 `Error` 类型，因为只有 `Error` 类型才具备堆栈信息，便于问题定位。**

## 框架层统一异常处理

框架通过 [onerror](https://github.com/eggjs/egg-onerror) 插件提供统一的错误处理机制。此机制将捕获所有处理方法（Middleware、Controller、Service）中抛出的任何异常，并根据请求预期的响应类型返回不同的错误内容。

| 请求格式需求 | 环境 | `errorPageUrl` 配置 | 返回内容 |
| ------------ | ---- | ------------------- | -------- |
| HTML & TEXT  | local & unittest | - | onerror 提供的详细错误页面 |
| HTML & TEXT  | 其他 | 是 | 重定向至 `errorPageUrl` |
| HTML & TEXT  | 其他 | 否 | 简易错误页（不含错误信息） |
| JSON & JSONP | local & unittest | - | 详细错误信息的 JSON 或 JSONP 响应 |
| JSON & JSONP | 其他 | - | 不含详细错误信息的 JSON 或 JSONP 响应 |

### errorPageUrl

配置了 `errorPageUrl` 后，线上应用 HTML 页面异常时将重定向至该地址。

```js
// config/config.default.js
module.exports = {
  onerror: {
    // 线上发生异常时，重定向到此页面
    errorPageUrl: '/50x.html'
  }
};
```

## 自定义统一异常处理

虽然框架提供了默认的异常处理机制，但应用开发中往往需自定义异常响应，特别是接口开发。onerror 插件支持自定义配置错误处理方法，允许覆盖默认方法。

```js
// config/config.default.js
module.exports = {
  onerror: {
    all(err, ctx) {
      // 定义所有响应类型的错误处理方法
      // 定义了 config.all 后，其他错误处理不再生效
      ctx.body = 'error';
      ctx.status = 500;
    },
    html(err, ctx) {
      // HTML 错误处理
      ctx.body = '<h3>error</h3>';
      ctx.status = 500;
    },
    json(err, ctx) {
      // JSON 错误处理
      ctx.body = { message: 'error' };
      ctx.status = 500;
    },
    jsonp(err, ctx) {
      // JSONP 错误一般不需特殊处理，自动调用 JSON 方法
    }
  }
};
```
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

在一些场景下，我们需要自定义服务器 404 时的响应。和自定义异常处理一样，我们也只需要加入一个中间件即可对 404 做统一处理：

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

在配置中引入中间件：

```js
// config/config.default.js
module.exports = {
    middleware: ['notfoundHandler'],
};
```
