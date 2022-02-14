---
title: Framework Built-in Objects
order: 2
---

At this chapter, we will introduce some built-in basic objects in the framework, including four objects (Application, Context, Request, Response) inherited from [Koa] and some objects that extended by the framework (Controller, Service , Helper, Config, Logger), we will often see them in the follow-up documents.

## Application

Application is a global application object, an application only instantiates one Application, it is inherited from [Koa.Application], we can mount some global methods and objects on it. We can easily [extend Application object] (./extend.md#Application) in plugin or application.

### Events

Framework will emits some events when server running, application developers or plugin developers can listen on these events to do some job like logging. As application developers, we can listen on these events in [app start script](./app-start.md).

- `server`: every worker will only emit once during the runtime, after HTTP server started, framework will expose HTTP server instance by this event.
- `error`: if any exception catched by onerror plugin, it will emit an `error` event with the exception instance and current context instance(if have), developers can listen on this event to report or logging.
- `request` and `response`: application will emit `request` and `response` event when receive requests and ended responses, developers can listen on these events to generate some digest log.

```js
// app.js

module.exports = (app) => {
  app.once('server', (server) => {
    // websocket
  });
  app.on('error', (err, ctx) => {
    // report error
  });
  app.on('request', (ctx) => {
    // log receive request
  });
  app.on('response', (ctx) => {
    // ctx.starttime is set by framework
    const used = Date.now() - ctx.starttime;
    // log total cost
  });
};
```

### How to Get

Application object can be accessed almost anywhere in application, here are a few commonly used access ways:

Almost all files (Controller, Service, Schedule, etc.) loaded by the [Loader] (../advanced/loader.md) can export a function that is called by the Loader and uses the app as a parameter:

- [App start script](./app-start.md)

  ```js
  // app.js
  module.exports = (app) => {
    app.cache = new Cache();
  };
  ```

- [Controller file](./controller.md)

  ```js
  // app/controller/user.js
  class UserController extends Controller {
    async fetch() {
      this.ctx.body = this.app.cache.get(this.ctx.query.id);
    }
  }
  ```

Like the [Koa], on the Context object, we can access the Application object via `ctx.app`. Use the above Controller file as an example:

```js
// app/controller/user.js
class UserController extends Controller {
  async fetch() {
    this.ctx.body = this.ctx.app.cache.get(this.ctx.query.id);
  }
}
```

In the instance objects that inherited from the Controller and Service base classes, the Application object can be accessed via `this.app`.

```js
// app/controller/user.js
class UserController extends Controller {
  async fetch() {
    this.ctx.body = this.app.cache.get(this.ctx.query.id);
  }
}
```

## Context

Context is a **request level object**, inherited from [Koa.Context]. When a request is received every time, the framework instantiates a Context object that encapsulates the information requested by the user and provides a number of convenient ways to get the request parameter or set the response information. The framework will mount all of the [Service] on the Context instance, and some plugins will mount some other methods and objects on it ([egg-sequelize] will mount all the models on the Context).

### How to Get

The most common way to get the Context instance is in [Middleware], [Controller], and [Service]. The access method in the Controller is shown in the above example. In the Service, the access way is same as Controller. The access Context method in the Middleware of Egg is same as [Koa] framework gets the Context object in its middleware.

The [Middleware] of Egg also supports Koa v1 and Koa v2 two different middleware coding formats. use different format, the way to access Context instance is also slightly different:

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
module.exports = (app) => {
  app.beforeStart(async () => {
    const ctx = app.createAnonymousContext();
    // preload before app start
    await ctx.service.posts.load();
  });
};
```

Each task in [Schedule](./schedule.md) takes a Context instance as a parameter so that we can more easily execute some schedule business logic:

```js
// app/schedule/refresh.js
exports.task = async (ctx) => {
  await ctx.service.posts.refresh();
};
```

## Request & Response

Request is a **request level object**, inherited from [Koa.Request]. Encapsulates the Node.js native HTTP Request object, and provides a set of helper methods to get commonly used parameters of HTTP requests.

Response is a **request level object**, inherited from [Koa.Response]. Encapsulates the Node.js native HTTP Response object, and provides a set of helper methods to set the HTTP response.

### How to Get

We can get the Request(`ctx.request`) and Response (` ctx.response`) instances of the current request on the Context instance.

```js
// app/controller/user.js
class UserController extends Controller {
  async fetch() {
    const { app, ctx } = this;
    const id = ctx.request.query.id;
    ctx.response.body = app.cache.get(id);
  }
}
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

In the Controller file, there are two ways to use the Controller base class:

```js
// app/controller/user.js

// get from egg (recommend)
const Controller = require('egg').Controller;
class UserController extends Controller {
  // implement
}
module.exports = UserController;

// get from app instance
module.exports = (app) => {
  return class UserController extends app.Controller {
    // implement
  };
};
```

## Service

Egg provides a Service base class and recommends that all [Service] inherit from the base class.

The properties of the Service base class are the same as those of the [Controller](#controller) base class, the access method is similar:

```js
// app/service/user.js

// get from egg (recommend)
const Service = require('egg').Service;
class UserService extends Service {
  // implement
}
module.exports = UserService;

// get from app instance
module.exports = (app) => {
  return class UserService extends app.Service {
    // implement
  };
};
```

## Helper

Helper is used to provide some useful utility functions. Its role is that we can put some commonly used functions into helper.js, so we can use JavaScript to write complex logic, avoid the logic being scattered everywhere, and can be more convenient to write test cases.

The Helper itself is a class that has the same properties as the [Controller](#controller) base class, and it will be instantiated at each request so that all functions on the Helper can also get context of the current request.

### How to Get

We can get the Helper(`ctx.helper`) instance of the current request on the Context instance.

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

In addition, Helper instances can also be accessed in template, for example, we can get `shtml` method provided by [security](../core/security.md) plugin in template.

```
// app/view/home.nj
{{ helper.shtml(value) }}
```

### Custom helper method

In application development, we may often customize some helper methods, such as `formatUser` in the above example, we can customize helper method with a way of [framework extension](./extend.md#helper).

```js
// app/extend/helper.js
module.exports = {
  formatUser(user) {
    return only(user, ['name', 'phone']);
  },
};
```

## Config

We recommend application development to follow the principle of configuration and code separation, put hard-coded business in configuration file, and the configuration file supports different runtime environments using different configurations, it is very convenient to use it. the framework, plugin and application-level configurations are available via the Config object. For configuration of Egg, read [Configuration](./config.md) in detail.

### How to Get

We can get the config object from the Application instance via `app.config`, or get the config object via` this.config` on the instance of Controller, Service or Helper.

## Logger

Egg builds in powerful [logger](../core/logger.md), it is very convenient to print a variety of levels of logs to the corresponding log file, each logger object provides 4 level methods:

- `logger.debug()`
- `logger.info()`
- `logger.warn()`
- `logger.error()`

Egg provides a number of Logger object, we simply introduce how to get each Logger and its use scenario.

### App Logger

We can get it via `app.logger`. If we want to do some application-level logging, such as logging some data in the startup phase, logging some business informations that are unrelated to request, those can be done by App Logger.

### App CoreLogger

We can get it via `app.coreLogger`, and we should not print logs via CoreLogger when developing applications. the framework and plugins need to print application-level logs to make it easier to distinguish from logs printed by applications and logs printed by frameworks, the logs printed by the CoreLogger will be placed in a different file than the Logger.

### Context Logger

We can get it via `ctx.logger` from Context instance, we can see from access method, Context Logger must be related to the request, it will take current request related information (such as `[$userId/$ip/$traceId/${cost}ms $method $url]`) in the front of logs, with this information, we can quickly locate requests from logs and concatenate all logs in one request.

### Context CoreLogger

We can get it via `ctx.coreLogger`, the difference between the Context Logger is that only plugins and framework will log via it.

### Controller Logger & Service Logger

We can get them via `this.logger` in Controller and Service instance, they are essentially a Context Logger, but additional file path will be added to logs, easy to locate the log print location.

## Subscription

Subscription is a common model for subscribing, for example, the consumer in message broker or schedule, so we provide the Subscription base class to normalize this model.

The base class of Subscription can be exported in the following way.

```js
const Subscription = require('egg').Subscription;

class Schedule extends Subscription {
  // This method should be implemented
  // subscribe can be async function or generator function
  async subscribe() {}
}
```

We recommend plugin developers to implement based on this model, For example, [Schedule](./schedule.md).

[koa]: http://koajs.com
[koa.application]: http://koajs.com/#application
[koa.context]: http://koajs.com/#context
[koa.request]: http://koajs.com/#request
[koa.response]: http://koajs.com/#response
[egg-sequelize]: https://github.com/eggjs/egg-sequelize
[middleware]: ./middleware.md
[controller]: ./controller.md
[service]: ./service.md
