title: Framework Built-in Objects
---

Before read it, we first introduce some built-in basic objects in the framework, including four objects (Application, Context, Request, Response) inherited from [Koa] and some objects that extend the framework (Controller, Service , Helper, Config, Logger), we will often see them in the follow-up document.

## Application

Application is a global application object, an application only instantiate one Application, it inherited from [Koa.Application], we can mount some global methods and objects on it. We can easily [extended Application object] (./extend.md#Application) in plugin or application.

### How to Get

Application object can be accessed almost anywhere in application, the following describes a few commonly used way:

Almost all files (Controller, Service, Schedule, etc.) loaded by the [Loader] (../advanced/loader.md) can export a function that is called by the Loader and uses the app as a parameter:

- [App start script](./app-start.md)

  ```js
  // app.js
  module.exports = app => {
    app.cache = new Cache();
  };
  ```

- [Controller file](./controller.md)

  ```js
  // app/controller/user.js
  module.exports = app => {
    return class UserController extends app.Controller {
      * fetch() {
        this.ctx.body = app.cache.get(this.ctx.query.id);
      }
    };
  };
  ```

Like the [Koa], on the Context object, we can access the Application object via `ctx.app`. Use the above Controller file as an example:

```js
// app/controller/user.js
module.exports = app => {
  return class UserController extends app.Controller {
    * fetch() {
      this.ctx.body = this.ctx.app.cache.get(this.ctx.query.id);
    }
  };
};
```

In instance objects that inherit from the Controller and Service base classes, the Application object can be accessed via `this.app`.

```js
// app/controller/user.js
module.exports = app => {
  return class UserController extends app.Controller {
    * fetch() {
      this.ctx.body = this.app.cache.get(this.ctx.query.id);
    }
  };
};
```

## Context

Context is a **request level object**, inherited from [Koa.Context]. Whenever receive a request, the framework instantiates a Context object that encapsulates the information requested by the user and provides a number of convenient ways to get the request parameter or set the response information. The framework will mount all of the [Service] on the Context instance, and some plugins will mount some other methods and objects on it ([egg-sequelize] will mount all the models on the Context).

### How to Get

The most common way to get the Context instance is in [Middleware], [Controller], and [Service]. The access method in the Controller is shown in the above example. In the Service, the access way is same as Controller. The access Context method in the Middleware of Egg is same as [Koa] framework gets the Context object in its middleware.

The [Middleware] of Egg also supports Koa v1 and Koa v2 two different middleware coding method, according to different method, the way to access Context instance is also slightly different:

```js
// Koa v1
function* middleware(next) {
  // this is instance of Context
  console.log(this.query);
  yield next;
}

// Koa v2
async function middleware(ctx, next) {
  // ctx is instance of Context
  console.log(ctx.query);
}
```

In addition to the request can get the Context instance, in some non-request scenario we need to access service / model and other objects on the Context instance, we can use`Application.createAnonymousContext ()` method to create an anonymous Context instance:

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

Each task in [Schedule](./schedule.md) takes a Context instance as a parameter so that we can more easily execute some schedule business logic:

```js
// app/schedule/refresh.js
exports.task = function* (ctx) {
  yield ctx.service.posts.refresh();
};
```

## Request & Response

Request is a **request level object**, inherited from [Koa.Request]. Encapsulates the Node.js native HTTP Request object, providing a set of helper methods to get commonly used parameters of HTTP requests.

Response is a **request level object**, inherited from [Koa.Response]. Encapsulates the Node.js native HTTP Response object, providing a set of helper methods to set the HTTP response.

### How to Get

We can get the Request(`ctx.request`) and Response (` ctx.response`) instances of the current request on the Context instance.

```js
// app/controller/user.js
module.exports = app => {
  return class UserController extends app.Controller {
    * fetch() {
      const { app, ctx } = this;
      const id = ctx.request.query.id;
      ctx.response.body = app.cache.get(id);
    }
  };
};
```

- [Koa] will proxy some methods and properties of Request and Response on Context, see [Koa.Context].
- `ctx.request.query.id` and` ctx.query.id` are equivalent in the above example , `ctx.response.body =` and `ctx.body =` are equivalent.
- It should be noted that get the body of POST should use `ctx.request.body` instead of` ctx.body`.

## Controller

Egg provides a Controller base class and recommends that all [Controller] inherit from the base class. The Controller base class has the following properties:

- `ctx` - [Context](#context) instance of the current request.
- `app` - [Application](#application) instance.
- `config` - application [configuration](./config.md).
- `service` - all [service](./ service.md) of application.
- `logger` - the encapsulated logger object for the current controller.

In the Controller file, there are two ways to refer to the Controller base class:

```js
// app/controller/user.js

// get from app instance (recommend)
module.exports = app => {
  return class UserController extends app.Controller {
    // implement
  };
};

// get from egg
const egg = require('egg');
module.exports = class UserController extends egg.Controller {
  // implement
};
```

## Service

Egg provides a Service base class and recommends that all [Service] inherit from the base class.

The fields of the Service base class are the same as those of the [Controller](#controller) base class, the access method is similar:

```js
// app/service/user.js

// get from app instance (recommend)
module.exports = app => {
  return class UserService extends app.Service {
    // implement
  };
};

// get from egg
const egg = require('egg');
module.exports = class UserService extends egg.Service {
  // implement
};
```

## Helper

Helper is used to provide some useful utility functions. Its role is that we can put some commonly used functions into helper.js, so we can use JavaScript to write complex logic, avoid the logic scattered everywhere, and can be more convenient to write test cases.

The Helper itself is a class that has the same fields as the [Controller](#controller) base class, and it will instantiated at each request so that all functions on the Helper can also get context of the current request.

### How to Get

We can get the Helper(`ctx.helper`) instance of the current request on the Context instance.

```js
// app/controller/user.js
module.exports = app => {
  return class UserController extends app.Controller {
    * fetch() {
      const { app, ctx } = this;
      const id = ctx.query.id;
      const user = app.cache.get(id);
      ctx.body = ctx.helper.formatUser(user);
    }
  };
};
```

In addition, Helper instances can also be accessed in template, for example, we can get [security](../core/security.md) plugin provided `shtml` method from template.

```
// app/view/home.nj
{{ helper.shtml(value) }}
```

### Custom helper method

In application development, we may often customize some helper methods, such as `formatUser` in the above example, we can use [framework extension](./Extend.md#helper) to customize helper method.

```js
// app/extend/helper.js
module.exports = {
  formatUser(user) {
    return only(user, [ 'name', 'phone' ]);
  }
};
```

## Config

We recommend application development to follow the principle of configuration and code separation, put hard-coded business in configuration file, and the configuration file support different runtime environments using different configurations, the framework, plugin and application-level configurations are available via the Config object. For configuration of Egg, read [Configuration](./config.md) in detail.

### How to Get

We can get the config object from the Application instance via `app.config`, or get the config object via` this.config` on the instance of Controller, Service or Helper.

## Logger

Egg built powerful [logger](../core/logger.md), it is very convenient to print a variety of levels of logs to the corresponding log file, each logger object provides 5 level methods:

- `logger.debug()`
- `logger.info()`
- `logger.warn()`
- `logger.error()`

Egg provides a number of Logger object, we simply introduce how to get each Logger and its scenario.

### App Logger

We can get it via `app.logger`. If we want to do some application-level logging, such as logging some data in the startup phase, logging some business related information, those can be done by App Logger.

### App CoreLogger

We can get it via `app.coreLogger`, and we should not print logs via CoreLogger when developing applications, the framework and plugins need to print application-level logs to make it easier to distinguish from applications printed logs, the logs printed by the CoreLogger will be placed in a different file than the Logger.

### Context Logger

We can get it via `ctx.logger` from Context instance, we can see from access method, Context Logger must be related to the request, it will take current request related information (such as `[$userId/$ip/$traceId/${cost}ms $method $url]`) in the front of logs, with this information, we can quickly locate requests from logs and concatenate all logs in one request.

### Context CoreLogger

We can get it via `ctx.coreLogger`, the difference between the Context Logger is that only plugins and framework will log via it.

### Controller Logger & Service Logger

We can get them via `this.logger` in Controller and Service instance, they are essentially a Context Logger, but additional file path will be added to logs, easy to locate the log print location.

## Subscription

Subscription is the model for subscribing, including consumer in message broker or schedule.

The base class of Subscription is exported by egg.

```js
const Subscription = require('egg').Subscription;

class Schedule extends Subscription {
  // This method should be implemented
  // subscribe can be generator function or async function
  * subscribe() {}
}
```

We recommend plugin developers to implement based on this model, For example, [Schedule](./schedule.md).

[Koa]: http://koajs.com
[Koa.Application]: http://koajs.com/#application
[Koa.Context]: http://koajs.com/#context
[Koa.Request]: http://koajs.com/#request
[Koa.Response]: http://koajs.com/#response
[egg-sequelize]: https://github.com/eggjs/egg-sequelize
[Middleware]: ./middleware.md
[Controller]: ./controller.md
[Service]: ./service.md
