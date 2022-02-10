---
title: Extend EGG
order: 11
---

Egg.js is extensible and it provides multiple extension points to enhance the functionality of itself:

- Application
- Context
- Request
- Response
- Helper

We could use the extension APIs to help us to develop, or extend the objects given above to enhance the functionality of egg as well while programming.

## Application

The object `app` is just the same aspect as the global application object in Koa. There should be only one `app` in your application, and it will be created by egg when the application is started.

### Access Method

- `ctx.app`
- You can access the Application object by using `this.app` in Controller, Middleware, Helper, Service. For instance, `this.app.config` will help you access the Config object.
- The `app` object would be injected into the entry function as the first argument in `app.js`, like this:

  ```js
  // app.js
  module.exports = (app) => {
    // here you can use the app object
  };
  ```

### How to Extend

Egg will merge the object defined in `app/extend/application.js` with the prototype of Application object in Koa, then generate object `app` which is based on the extended prototype when application is started.

#### Extend Methods

If we want to create a method `app.foo()`, we can do it like this: ：

```js
// app/extend/application.js
module.exports = {
  foo(param) {
    // `this` points to the object app, you can access other methods or property of app with this
  },
};
```

#### Extend Properties

Generally speaking, the calculation of properties only need to be done once, therefore we have to do some cache, otherwise it will degrade performance of the app as too much calculation would be going to do when accessing those properties several times.

So, it's recommended to use Symbol + Getter.

For example, if we would like to add a Getter property `app.bar`:

```js
// app/extend/application.js
const BAR = Symbol('Application#bar');

module.exports = {
  get bar() {
    // `this` points to the app object, you can access other methods or property of app with this
    if (!this[BAR]) {
      // It should be more complex in real situation
      this[BAR] = this.config.xx + this.config.yy;
    }
    return this[BAR];
  },
};
```

## Context

Context means the context in Koa, which is a **Request Level** object. That is to say, every request from client will generate an Context instance. We usually write Context as `ctx` in short. In all the doc, both Context and `ctx` means the context object in Koa.

### Access Method

- `this` in middleware is ctx, such as `this.cookies.get('foo')`。
- There are two different ways to write controller. If you use class to describe controller, you can use `this.ctx` to access Context. Or if you write as method, you can access Context with `ctx` directly.
- `this` in helper, service points to the helper object and service object themselves. Simply use `this.ctx` to access Context object, such as `this.ctx.cookies.get('foo')`.

### How to extend

Egg will merge the object defined in `app/extend/context.js` with the prototype of Context object in Koa. And it will generate a `ctx` object which is based on the extended prototype when deal with request.

#### Extend Methods

For instance, we could add a method `ctx.foo()` in the following way:

```js
// app/extend/context.js
module.exports = {
  foo(param) {
    // `this` points to the ctx object, you can access other methods or property of ctx
  },
};
```

#### Extend Properties

Generally speaking, the calculation of properties only need to do once, therefore we have to do some cache, otherwise it will degrade performance of the app as too much calculation would be going to do when access those properties several times.

So, it's recommended to use Symbol + Getter.

For example, if we would like to add a Getter property `ctx.bar`:

```js
// app/extend/context.js
const BAR = Symbol('Context#bar');

module.exports = {
  get bar() {
    // `this` points to the ctx object, you can access other methods or property of ctx
    if (!this[BAR]) {
      // For example, we can get from header, but it should be more complex in real situation.
      this[BAR] = this.get('x-bar');
    }
    return this[BAR];
  },
};
```

## Request

Request object is the same as that in Koa, which is a **Request Level** object. It provides a great number of methods to help to access the properties and methods you need.

### Access Method

```js
ctx.request;
```

So many properties and methods in `ctx` can also be accessed in `request` object. For those properties and methods, it is just the same to access them by using either `ctx` or `request`, such as `ctx.url === ctx.request.url`.

Here are the properties and methods in `ctx` which can also be accessed by Request aliases: [Koa - Request aliases](http://koajs.com/#request-aliases)

### How to Extend

Egg will merge the object defined in `app/extend/request.js` and the prototype of `request` object built in egg. And it will generate a `request` object which is based on the extended prototype when deal with request.

For instance, we could add a property `request.foo` in the following way:

```js
// app/extend/request.js
module.exports = {
  get foo() {
    return this.get('x-request-foo');
  },
};
```

## Response

Response object is the same as that in Koa, which is a **Request Level** object. It provides a great number of methods to help to access the properties and methods you need.

### Access Method

```js
ctx.response;
```

So many properties and methods in `ctx` can also be accessed in `response` object. For those properties and methods, it is just the same to access them by using either `ctx` or `response`. For example `ctx.status = 404` is the same as `ctx.response.status = 404`.

Here are the properties and methods in `ctx` which can also be accessed by Response aliases: [Koa Response aliases](http://koajs.com/#response-aliases)

### How to Extend

Egg will merge the object defined in `app/extend/response.js` and the prototype of `response` object build in egg. And it will generate a `response` object which is based on the extended prototype after dealt with request.

For instance, we could add a setter `request.foo` in the following way:

```js
// app/extend/response.js
module.exports = {
  set foo(value) {
    this.set('x-response-foo', value);
  },
};
```

Then we can use the setter like this: `this.response.foo = 'bar';`

## Helper

Function Helper can provides some useful utility functions.

We can put some utility functions we use ofter into helper.js as an individual function. Then we can write the complex codes in JavaScript, avoiding to write them everywhere. Besides, such a simple function like Helper allows to write test case much easier.

Egg has had some build-in Helper functions. We can write our own Helper as well.

### Access Method

Access helper object with `ctx.helper`, for example:

```js
// Assume that home router has already defined in app/router.js
app.get('home', '/', 'home.index');

// Use helper to calculate the specific url path
ctx.helper.pathFor('home', { by: 'recent', limit: 20 });
// => /?by=recent&limit=20
```

### How to Extend

Egg will merge the object defined in `app/extend/helper.js` and the prototype of `helper` object build in egg. And it will generate a `helper` object which is based on the extended prototype after dealt with request.

For instance, we could add a method `helper.foo()` in the following way:

```js
// app/extend/helper.js
module.exports = {
  foo(param) {
    // // `this` points to the helper object, you can access other methods or property of helper
    // this.ctx => context object
    // this.app => application object
  },
};
```

## Extend according to environment

Besides, we can extend the framework in an optional way according to the environment. For example, if you want `mockXX()` only be able to accessed when doing unittest:

```js
// app/extend/application.unittest.js
module.exports = {
  mockXX(k, v) {},
};
```

This file will only be required under unittest environment.

Similarly, we could extend egg in this way for other object,such as Application, Context, Request, Response and Helper. See more on [environment](./env.md)
