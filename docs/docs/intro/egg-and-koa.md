---
title: Egg and Koa
order: 1
---

## Asynchronous Programming Model

Node.js is an asynchronous world, asynchronous programming models in official API support are all in callback form，it brings many problems. For example:

- [callback hell](http://callbackhell.com/): Notorious "callback hell"。
- [release zalgo](https://oren.github.io/#/articles/zalgo/): Asynchronous functions may call callback function response data synchronously which would bring inconsistency.

The community has provided many solutions for the problems and the winner is Promise. It is built into ECMAScript 2015. On the basis of Promise, and with the ability of Generator to switch context, we can write asynchronous code in a synchronous way with [co] and other third-party libraries. Meanwhile [async function], the official solution has been published in ECMAScript 2017 and landed in Node.js 8.

### Async Function

[Async function] is a syntactic sugar at the language level. In async function, we can use `await` to wait for a promise to be resolved(or rejected, which will throw an exception), and Node.js LTS (8.x) has supported this feature.

```js
const fn = async function () {
  const user = await getUser();
  const posts = await fetchPosts(user.id);
  return { user, posts };
};
fn()
  .then((res) => console.log(res))
  .catch((err) => console.error(err.stack));
```

## Koa

> [Koa](https://koajs.com/) is a new Web framework designed by the team behind Express, which aims to be a smaller, more expressive, and more robust foundation for Web applications and APIs.

The design styles of Koa and Express are very similar, The underlying basic library is the same, [HTTP library](https://github.com/jshttp). There are several significant differences between them. Besides the asynchronous solution by default mentioned above, there are the following points.

### Midlleware

The middleware in Koa is different from Express, Koa use the onion model:

- Middleware onion diagram:

![](https://camo.githubusercontent.com/d80cf3b511ef4898bcde9a464de491fa15a50d06/68747470733a2f2f7261772e6769746875622e636f6d2f66656e676d6b322f6b6f612d67756964652f6d61737465722f6f6e696f6e2e706e67)

- Middleware execution sequence diagram:

![](https://raw.githubusercontent.com/koajs/koa/a7b6ed0529a58112bac4171e4729b8760a34ab8b/docs/middleware.gif)

All the requests will be executed twice during one middleware. Compared to Express middleware, it is very easy to implement post-processing logic. You can obviously feel the advantage of Koa middleware model by comparing the compress middleware implementatio in Koa and Express.

- [koa-compress](https://github.com/koajs/compress/blob/master/lib/index.js) for Koa.
- [compression](https://github.com/expressjs/compression/blob/master/index.js) for Express.

### Context

Unlike that there are only two objects `Request` and `Response` in Express, Koa has one more, `Context` object in one HTTP request(it is `this` in Koa 1, while it is the first parameter for middleware function in Koa 2). We can mount all the related properties in one request to this object. Such as [traceId](https://github.com/eggjs/egg-tracer/blob/1.0.0/lib/tracer.js#L12) that runs through the whole request lifetime (which will be called anywhere afterward) could be mounted. It is more semantic other than request and response.

At the same time Request and Response are mounted to the Context object. Just like Express, the two objects provide lots of easy ways to help developing. For example:

- `get request.query`
- `get request.hostname`
- `set response.body`
- `set response.status`

### Exception Handling

Another enormous advantage for writing asynchronous code in a synchronous way is that it is quite easy to handle the exception. You can catch all the exceptions thrown in the codes followed the convention with `try catch`. We can easily write a customized exception handling middleware.

```js
async function onerror(ctx, next) {
  try {
    await next();
  } catch (err) {
    ctx.app.emit('error', err);
    ctx.body = 'server error';
    ctx.status = err.status || 500;
  }
}
```

Putting this middleware before others, you can catch all the exceptions thrown by the synchronous or asynchronous code.

## Egg Inherits from Koa

As described above, Koa is an excellent framework. However, it is not enough to build an enterprise-class application.

Egg is built around the Koa. On the basis of Koa model, Egg implements enhancements one step further.

### Extension

In the framework or application based on Egg, we can extend the prototype of 4 Koa objects by defining `app/extend/{application,context,request,response}.js`. With this, we can write more utility methods quickly. For example, we have the following code in `app/extend/context.js`:

```js
// app/extend/context.js
module.exports = {
  get isIOS() {
    const iosReg = /iphone|ipad|ipod/i;
    return iosReg.test(this.get('user-agent'));
  },
};
```

It can be used in controller then:

```js
// app/controller/home.js
exports.handler = (ctx) => {
  ctx.body = ctx.isIOS
    ? 'Your operating system is iOS.'
    : 'Your operating system is not iOS.';
};
```

More about extension, please check [Exception](../basics/extend.md) section.

### Plugin

As is known to all, Many middlewares are imported to provide different kinds of features in Express and Koa. Eg, [koa-session](https://github.com/koajs/session) provides the Session support, [koa-bodyparser](https://github.com/koajs/bodyparser) help to parse request body. Egg has provided a powerful plugin mechanism to make it easier to write stand-alone features.

One plugin can include:

- extend：extend the context of base object, provide utility and attributes.
- middleware：add one or more middlewares, provide pre or post-processing logic for request.
- config：configure the default value in different environments.

A stand-alone module plugin can provide rich features with high maintainability. You can almost forget the configuration as the plugin supports configuring the default value in different environments.

[egg-security](https://github.com/eggjs/egg-security) is a typical example.

More about plugin, please check [Plugin](../basics/plugin.md) section.

### Roadmap

#### Egg 1.x

When Egg 1.x released, the Node.js LTS version did not support async function，so Egg 1.x was based on Koa 1.x. On the basis of this, Egg had added fully async function support. Egg is completely compatible with middlewares in Koa 2.x, all applications could write with `async function`.

- The underlying is based on Koa 1.x, asynchronous solution is based on the generator function wrapped by [co].
- Official plugin and the core of Egg are written in generator function, keep supporting Node.js LTS version, use [co] when necessary to be compatible with async function.
- Application developers can choose either async function (Node.js 8.x+) or generator function (Node.js 6.x+).

#### Egg 2.x

When Node.js 8 became LTS version, an async function could be used in Node.js without any performance problem. Egg released 2.x based on Koa 2.x, the framework and built-in plugins were all written by async function, and Egg 2.x still kept compatibility with generator function and all the usages in Egg 1.x, applications based on Egg 1.x can migrate to Egg 2.x only by upgrading to Node.js 8.

- The underlying will be based on Koa 2.x, the asynchronous solution will be based on async function.
- The official plugin and core of egg will be written in an async function.
- Recommend the user to transfer the business layer to async function.
- Only support Node.js 8+.

[co]: https://github.com/tj/co
[async function]: https://github.com/tc39/ecmascript-asyncawait
[async function]: https://github.com/tc39/ecmascript-asyncawait
