---
title: 框架内置基础对象
order: 2
---

在本章中，我们将初步了解框架内部内置的一些基础对象。这些对象包括从 [Koa] 继承而来的 4 个对象（`Application`，`Context`，`Request`，`Response`）以及框架扩展的其他一些对象（`Controller`，`Service`，`Helper`，`Config`，`Logger`）。在后续的文档中，我们会经常遇到它们。

## Application

Application 是全局应用对象。在一个应用中，每个进程只会实例化一个 Application 实例。它继承自 `Koa.Application`，在其上我们可以挂载一些全局的方法和对象。我们可以轻易地在插件或应用中[扩展 Application 对象](./extend.md#Application)。

### 事件

在框架运行时，会在 Application 实例上触发一些事件，应用开发者或插件开发者可以监听这些事件做一些操作。作为应用开发者，我们一般会在[启动自定义脚本](./app-start.md)中进行监听：

- `server`：该事件在一个 worker 进程中只会触发一次，在 HTTP 服务完成启动后，会通过这个事件将 HTTP server 暴露出来给开发者。
- `error`：运行时捕获到任何异常后，都会触发 `error` 事件，将错误对象和关联的上下文（如果有）暴露出来，开发者可以对其进行自定义的日志记录、上报等处理。
- `request` 和 `response`：应用收到请求和响应请求时，分别会触发 `request` 和 `response` 事件，并将当前请求的上下文暴露出来，开发者可以监听这两个事件进行日志记录。

```js
// app.js

module.exports = (app) => {
  app.once('server', (server) => {
    // websocket 相关操作
  });
  app.on('error', (err, ctx) => {
    // 上报错误
  });
  app.on('request', (ctx) => {
    // 记录收到的请求
  });
  app.on('response', (ctx) => {
    // ctx.starttime 是由框架设置的
    const used = Date.now() - ctx.starttime;
    // 记录请求总耗时
  });
};
```

### 获取方式

Application 对象在编写应用时几乎任何场合都能获取到，下面介绍几个常用的获取方式：

几乎所有由框架 `Loader` 加载的文件（Controller、Service、Schedule 等），都可以通过导出一个函数来获取 Application 实例，该函数会被 `Loader` 调用，并将 app 作为参数：

- [启动自定义脚本](./app-start.md)

  ```js
  // app.js
  module.exports = (app) => {
    app.cache = new Cache();
  };
  ```

- [Controller 文件](./controller.md)

  ```js
  // app/controller/user.js
  class UserController extends Controller {
    async fetch() {
      this.ctx.body = this.app.cache.get(this.ctx.query.id);
    }
  }
  ```

与 `Koa` 一样，在 Context 对象上，可以通过 `ctx.app` 访问到 Application 对象。以 Controller 文件为例：

```js
// app/controller/user.js
class UserController extends Controller {
  async fetch() {
    this.ctx.body = this.ctx.app.cache.get(this.ctx.query.id);
  }
}
```

在继承自 Controller、Service 基类的实例中，可以通过 `this.app` 访问到 Application 对象。

```js
// app/controller/user.js
class UserController extends Controller {
  async fetch() {
    this.ctx.body = this.app.cache.get(this.ctx.query.id);
  }
}
```
## Context

Context 是一个**请求级别的对象**，继承自 [Koa.Context]。在每次收到用户请求时，框架都会实例化一个 Context 对象。这个对象封装了这次用户请求的信息，并提供了许多便捷的方法来获取请求参数或者设置响应信息。框架会将所有的 [Service] 挂载到 Context 实例上。部分插件也会将其他方法和对象挂载至其上（如 [egg-sequelize] 会将所有的 model 挂到 Context 上）。

### 获取方式

获取 Context 实例的最常见方式是在 [Middleware]、[Controller] 以及 [Service] 中。我们已经在 Controller 的示例中看到了相应的获取方式。在 Service 中获取 Context 的方法与 Controller 中相同，在 Middleware 中获取 Context 实例的方法则与 [Koa] 框架的中间件中使用方法一致。

框架的 [Middleware] 支持 Koa v1 和 Koa v2 两种中间件的写法。根据不同的写法，获取 Context 实例的方式略有区别：

```js
// Koa v1
function* middleware(next) {
  // this 为 Context 的实例
  console.log(this.query);
  yield next;
}

// Koa v2
async function middleware(ctx, next) {
  // ctx 为 Context 的实例
  console.log(ctx.query);
}
```

除了在处理请求时可以获得 Context 实例外，还有一些非用户请求的场景下需要访问 service / model 等 Context 实例上的对象。这时我们可以通过 `Application.createAnonymousContext()` 方法创建一个匿名 Context 实例：

```js
// app.js
module.exports = (app) => {
  app.beforeStart(async () => {
    const ctx = app.createAnonymousContext();
    // 应用启动前预加载
    await ctx.service.posts.load();
  });
};
```

在[定时任务](./schedule.md)中，每个 task 都接收一个 Context 实例作为参数，这样我们可以更便利地执行一些定时的业务逻辑：

```js
// app/schedule/refresh.js
exports.task = async (ctx) => {
  await ctx.service.posts.refresh();
};
```
## Request & Response

Request 是一个**请求级别的对象**，继承自 `[Koa.Request]`。封装了 Node.js 原生的 HTTP Request 对象，提供了一系列辅助方法获取 HTTP 请求常用参数。

Response 是一个**请求级别的对象**，继承自 `[Koa.Response]`。封装了 Node.js 原生的 HTTP Response 对象，提供了一系列辅助方法设置 HTTP 响应。

### 获取方式

可以在 Context 的实例上获取到当前请求的 Request(`ctx.request`) 和 Response(`ctx.response`) 实例。

```js
// app/controller/user.js
class UserController extends Controller {
  async fetch() {
    const { app, ctx } = this;
    // 获取请求中的 `id` 参数
    const id = ctx.request.query.id;
    // 设置响应体
    ctx.response.body = app.cache.get(id);
  }
}
```

- `[Koa]` 会在 Context 上代理一部分 Request 和 Response 上的方法和属性，参见 `[Koa.Context]`。
- 如上面例子中的 `ctx.request.query.id` 和 `ctx.query.id` 是等价的，`ctx.response.body =` 和 `ctx.body =` 也是等价的。
- 需要注意的是，获取 POST 的 body 应该使用 `ctx.request.body`，而不是 `ctx.body`。
## Controller

框架提供了一个 Controller 基类，并推荐所有的 `Controller` 都继承于该基类实现。这个 Controller 基类有下列属性：

- `ctx` - 当前请求的 `Context` 实例。
- `app` - 应用的 `Application` 实例。
- `config` - 应用的[配置](./config.md)。
- `service` - 应用的所有 [service](./service.md)。
- `logger` - 为当前 `Controller` 封装的 `logger` 对象。

在 `Controller` 文件中，可以通过两种方式来引用 Controller 基类：

```js
// app/controller/user.js

// 从 egg 上获取（推荐）
const Controller = require('egg').Controller;
class UserController extends Controller {
  // 实现
}
module.exports = UserController;

// 从 app 实例上获取
module.exports = (app) => {
  return class UserController extends app.Controller {
    // 实现
  };
};
```
## Service

框架提供了一个 Service 基类，并推荐所有的 Service 都继承于该基类实现。

Service 基类的属性和 [Controller](#controller) 基类属性一致，访问方式也类似：

```js
// app/service/user.js

// 从 egg 上获取（推荐）
const Service = require('egg').Service;
class UserService extends Service {
  // implement
}
module.exports = UserService;

// 从 app 实例上获取
module.exports = (app) => {
  return class UserService extends app.Service {
    // implement
  };
};
```
## Helper

Helper 用来提供一些实用的 utility 函数。它的作用在于我们可以将一些常用的动作抽离在 `helper.js` 里面成为一个独立的函数。这样可以利用 JavaScript 编写复杂的逻辑，避免逻辑分散于各个地方，同时便于更好地编写测试用例。

Helper 本身是一个类，具有和 `Controller` 基类相同的属性，它也会在每次请求时进行实例化。因此，Helper 上的所有函数也能获取到当前请求相关的上下文信息。

### 获取方式

可以在 Context 的实例上获取到当前请求的 Helper（`ctx.helper`）实例。

```js
// app/controller/user.js
class UserController extends Controller {
  async fetch() {
    const { app, ctx } = this;
    const id = ctx.query.id;
    const user = app.cache.get(id);
    ctx.body = ctx.helper.formatUser(user);
  }
}
```

除此之外，Helper 的实例还可以在模板中获取。例如，可以在模板中使用 [security](../core/security.md) 插件提供的 `shtml` 方法。

```html
<!-- app/view/home.nj -->
{{ helper.shtml(value) }}
```

### 自定义 Helper 方法

在应用开发中，我们可能经常需要自定义一些 Helper 方法。例如上面例子中的 `formatUser`，我们可以通过 [框架扩展](./extend.md#helper) 的形式来自定义 Helper 方法。

```js
// app/extend/helper.js
module.exports = {
  formatUser(user) {
    return only(user, ['name', 'phone']);
  },
};
```
## Config

我们推荐应用开发遵循配置和代码分离的原则，将一些需要硬编码的业务配置都放到配置文件中。同时，配置文件支持各个不同的运行环境使用不同的配置，使用起来也非常方便。所有框架、插件和应用级别的配置都可以通过 `Config` 对象获取到。关于框架的配置，可以详细阅读[Config 配置](./config.md)章节。

### 获取方式

我们可以通过 `app.config` 从 `Application` 实例上获取到 `config` 对象，也可以在 Controller、Service、Helper 的实例上通过 `this.config` 获取到 `config` 对象。
## Logger

框架内置了功能强大的[日志功能](../core/logger.md)，可以非常方便地打印各种级别的日志到对应的日志文件中，每一个 logger 对象都提供了 4 个级别的方法：

- `logger.debug()`
- `logger.info()`
- `logger.warn()`
- `logger.error()`

在框架中提供了多个 Logger 对象，下面我们简单地介绍一下各个 Logger 对象的获取方式和使用场景。

### App Logger

我们可以通过 `app.logger` 来获取它。如果我们想做一些应用级别的日志记录，如记录启动阶段的一些数据信息，记录一些与请求无关的业务信息，都可以通过 App Logger 来完成。

### App CoreLogger

我们可以通过 `app.coreLogger` 来获取它。一般在开发应用时，我们不应该通过 CoreLogger 打印日志。而框架和插件则需要通过它来打印应用级别的日志，这样可以更清晰地区分应用和框架打印的日志。通过 CoreLogger 打印的日志会被放到与 Logger 不同的文件中。

### Context Logger

我们可以从 Context 实例上，通过 `ctx.logger` 获取它。从访问方式上我们可以看出，Context Logger 一定是与请求相关的。它打印的日志都会在前面带上一些当前请求相关的信息（如 `[$userId/$ip/$traceId/${cost}ms $method $url]`）。通过这些信息，我们可以从日志快速定位请求，并串联一次请求中的所有日志。

### Context CoreLogger

我们可以通过 `ctx.coreLogger` 获取它。它与 Context Logger 的区别在于，一般只有插件和框架会通过它来记录日志。

### Controller Logger 和 Service Logger

我们可以在 Controller 和 Service 实例上，通过 `this.logger` 获取它们。它们实质上就是一个 Context Logger，不过在打印日志时，还会额外地加上文件路径，以方便定位日志的打印位置。

## 订阅模型

订阅模型是一种比较常见的开发模式，例如消息中间件的消费者或调度任务。因此，我们提供了 `Subscription` 基类来规范化这个模式。

你可以通过以下方式来引用 `Subscription` 基类：

```js
const Subscription = require('egg').Subscription;

class Schedule extends Subscription {
  // 需要实现此方法
  // subscribe 可以为 async function 或 generator function
  async subscribe() {}
}
```

插件开发者可以根据自己的需求，基于它定制订阅规范，例如定时任务就是使用这种规范实现的。

相关链接：
- [koa](http://koajs.com)
- [koa.application](http://koajs.com/#application)
- [koa.context](http://koajs.com/#context)
- [koa.request](http://koajs.com/#request)
- [koa.response](http://koajs.com/#response)
- [egg-sequelize](https://github.com/eggjs/egg-sequelize)
- [中间件（middleware）](./middleware.md)
- [控制器（controller）](./controller.md)
- [服务（service）](./service.md)
