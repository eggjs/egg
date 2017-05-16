title: egg 内置基础对象
---

在往下阅读之前，我们先初步介绍一下框架中内置的一些基础对象，包括从 [koa] 继承而来的 4 个对象（Application, Context, Request, Response) 以及框架扩展的一些对象（Helper, Controller, Service），在后续的文档阅读中我们会经常遇到他们。

## Application

Application 是全局应用对象，在一个应用中，只会实例化一个，它继承自 [koa.Application]，在它上面我们可以挂载一些全局的方法和对象。我们可以轻松的在插件或者应用中[扩展 Application 对象](./extend.md#Application)。

### 获取方式

Application 对象几乎可以在编写应用时的任何一个地方获取到，下面介绍几个经常用到的获取方式：

几乎所有被框架 [Loader](../advanced/loader.md) 加载的文件（Controller，Service，Schedule 等），都可以 export 一个函数，这个函数会被 Loader 调用，并使用 app 作为参数：

- [启动自定义脚本](./app-start.md)

  ```js
  // app.js
  module.exports = app => {
    app.cache = new Cache();
  };
  ```

- [Controller 文件](./controller.md)

  ```js
  // app/controller/user.js
  module.exports = app => {
    return class UserController extends app.Controller {
      fetch* () {
        this.ctx.body = app.cache.get(this.query.id);
      }
    };
  };
  ```

和 [koa] 一样，在 Context 对象上，可以通过 `ctx.app` 访问到 Application 对象。以上面的 Controller 文件举例：

```js
// app/controller/user.js
module.exports = app => {
  return class UserController extends app.Controller {
    fetch* () {
      this.ctx.body = this.ctx.app.cache.get(this.query.id);
    }
  };
};
```

在 Controller, Service 类中，可以通过 `this.app` 访问到 Application 对象。

```js
// app/controller/user.js
module.exports = app => {
  return class UserController extends app.Controller {
    fetch* () {
      this.ctx.body = this.app.cache.get(this.query.id);
    }
  };
};
```

## Context

Context 是一个**请求级别的对象**，继承自 [koa.Context]。在每一次收到用户请求时，框架会实例化一个 Context 对象，这个对象封装了这次用户请求的信息，并提供了许多便捷的方法来获取请求参数或者设置响应信息。框架会将所有的 [service](./service.md) 挂载到 Context 实例上，一些插件也会将一些其他的方法和对象挂载到它上面（[egg-sequelize] 会将所有的 model 挂载在 Context 上。

### 获取方式

最常见的 context 实例获取方式是在 [Middleware], [Controller] 以及 [Service] 中。[Controller] 中的获取方式在上面的例子中已经展示过了，在 [Service] 中获取和 [Controller] 中获取的方式一样，在 [Middleware] 中获取 Contenxt 实例则和 [koa] 框架在中间件中获取 Context 对象的方式一致。

框架的 [Middleware] 同时支持 koa v1 和 koa v2 两种不同的中间件写法，根据不同的写法，获取 Context 实例的方式也稍有不同：

```js
// koa v1
function* middleware(next) {
  // this is instance of Context
  console.log(this.query);
  yield next;
}

// koa v2
async function middleware(ctx, next) {
  // ctx is instance of Context
  console.log(ctx.query);
}
```

除了在请求时可以获取 Context 实例之外， 在有些非用户请求的场景下我们需要访问 service / model 等 Context 实例上的对象，我们可以通过 `Application.createAnonymousContext()` 方法创建一个匿名 Context 实例：

```js
// app.js
module.exports = app => {
  app.beforeStart(function* () {
    const ctx = app.createAnonymousContext();
    // preload before app start
    yield ctx.service.posts.load();
  });
}
```

在[定时任务](./schedule.md)中的每一个 task 都接受一个 Context 实例作为参数，以便我们更方便的执行一些定时的业务逻辑：

```js
// app/schedule/refresh.js
exports.task = function* (ctx) {
  yield ctx.service.posts.refresh();
};
```

## Request & Response

Request 是一个**请求级别的对象**，继承自 [koa.Request]。封装了 node 原生的 http request 对象，提供了一系列辅助方法获取 HTTP 请求常用参数。

Response 是一个**请求级别的对象**，继承自 [koa.Response]。封装了 node 原生的 http response 对象，提供了一系列辅助方法设置 HTTP 响应。

### 获取方式

可以在 Context 的实例上获取到当前请求的 Request(`ctx.request`) 和 Response(`ctx.response`) 实例。

```js
// app/controller/user.js
module.exports = app => {
  return class UserController extends app.Controller {
    fetch* () {
      const id = this.request.query.id;
      this.ctx.response.body = this.app.cache.get(id);
    }
  };
};
```

## Controller

框架提供了一个 Controller 基类，并推荐所有的 [Controller] 都继承于该基类实现。这个 Controller 基类有下列属性：

- `ctx` - 当前请求的 [Context](#context) 实例。
- `app` - 应用的 [Application](#application) 实例。
- `config` - 应用的[配置](./config.md)。
- `service` - 应用所有的 [service](./service.md)。
- `logger` - 为当前 controller 封装的 logger 对象。

在 Controller 文件中，可以通过两种方式来引用 Controller 基类：

```js
// app/controller/user.js

// 从 egg 上获取
module.exports = UserController extends require('egg').Controller {
  // implement  
};

// 从 app 实例上获取
module.exports = app => {
  return UserController extends app.Controller {
    // implement
  };
};
```

## Service

框架提供了一个 Service 基类，并推荐所有的 [Service] 都继承于该基类实现。

Service 基类的属性和 [Controller](#controller) 基类属性一致，访问方式也类似：

```js
// app/service/user.js

// 从 egg 上获取
module.exports = UserService extends require('egg').Service {
  // implement  
};

// 从 app 实例上获取
module.exports = app => {
  return UserService extends app.Service {
    // implement
  };
};
```

## Helper

Helper 用来提供一些实用的 utility 函数。它的作用在于我们可以将一些常用的动作抽离在 helper.js 里面成为一个独立的函数，这样可以用 JavaScript 来写复杂的逻辑，避免逻辑分散各处，同时可以更好的编写测试用例。

Helper 自身是一个类，有和 [Controller](#controller) 基类一样的属性，它也会在每次请求时进行实例化，因此 Helper 上的所有函数也能获取到当前请求相关的上下文信息。

### 获取方式

可以在 Context 的实例上获取到当前请求的 Helper(`ctx.helper`) 实例。

```js
// app/controller/user.js
module.exports = app => {
  return class UserController extends app.Controller {
    fetch* () {
      const id = this.request.query.id;
      const user = this.app.cache.get(id);
      this.body = this.helper.formatUser(user);
    }
  };
};
```

### 自定义 helper 方法

应用开发中，我们可能经常要自定义一些 helper 方法，例如上面例子中的 `formatUser`，我们可以通过[框架扩展](./extend.md#helper)的形式来自定义 helper 方法。

```js
// app/extend/helper.js
module.exports = {
  formatUser(user) {
    return only(user, [ 'name', 'phone' ]);
  }
};
```

[koa]: http://koajs.com
[koa.Application]: http://koajs.com/#application
[koa.Context]: http://koajs.com/#context
[koa.Request]: http://koajs.com/#request
[koa.Response]: http://koajs.com/#response
[egg-sequelize]: https://github.com/eggjs/egg-sequelize
[Middleware]: ./middleware.md
[Controller]: ./controller.md
[Service]: ./service.md
