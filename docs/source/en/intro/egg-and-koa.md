title: Egg and Koa
---

## Asynchronous programming model

Node.js is an asynchronous world, asynchronous programming models in official API support are all in callback form ，it brings many problems. For example:

- [callback hell](http://callbackhell.com/): Notorious "callback hell"。
- [release zalgo](https://oren.github.io/blog/zalgo.html): Asynchronous functions may call callback function response data synchronously which would bring inconsistency.

The community has provided many solutions for the problems, the winner is Promise, it is built into ECMAScript 2015. On the basis of Promise, and Generator with the ability to switch context, we can write asynchronous code in synchronous way with [co] and other third party libraries. Meanwhile [async function], the official solution has been published in ECMAScript 2017 and landed in Node.js 8.

### Async function

[Async function] is a syntactic sugar at the language level. In async function, we can use `await` to wait a promise resolved(or rejected, which will throw an exception), and Node.js LTS (8.x) is support this feature.

```js
const fn = async function() {
  const user = await getUser();
  const posts = await fetchPosts(user.id);
  return { user, posts };
};
fn().then(res => console.log(res)).catch(err => console.error(err.stack));
```

## Koa

> Koa is a new Web framework designed by the team behind Express, which aims to be a smaller, more expressive, and more robust foundation for Web applications and APIs.

The design style of Koa and Express are very similar, The underlying base library is the same, [HTTP library](https://github.com/jshttp). There are several significant differences between them. Besides the asynchronous solution by default metioned above, there are the following points.

### Midlleware

The middleware in Koa is different from Express, Koa use the onion model:

- Middleware onion diagram:

![](https://camo.githubusercontent.com/d80cf3b511ef4898bcde9a464de491fa15a50d06/68747470733a2f2f7261772e6769746875622e636f6d2f66656e676d6b322f6b6f612d67756964652f6d61737465722f6f6e696f6e2e706e67)

- Middleware execution sequence diagram:

![](https://raw.githubusercontent.com/koajs/koa/a7b6ed0529a58112bac4171e4729b8760a34ab8b/docs/middleware.gif)

All the requests will be executed twice during one middleware. Compared to Express middleware, it is very easy to implementing post-processing logic. You can obviously feel the advantage of Koa middleware model comparing to the compress middleware implementing in Koa and Express.

- [koa-compress](https://github.com/koajs/compress/blob/master/index.js) for Koa.
- [compression](https://github.com/expressjs/compression/blob/master/index.js) for Express.

### Context

Unlike that there are only two objects `Request` and `Response` in Express, Koa has one more, `Context` object in one HTTP request(it is `this` in Koa 1, while it is the first parameter for middleware function in Koa 2). We can attach all the relative things to the object. Such as [traceId](https://github.com/eggjs/egg-tracer/blob/1.0.0/lib/tracer.js#L12) that runs through the request lifetime (which will be called anywhere afterward) could be attached. It is more semantic other than request and response.

At the same time Request and Response are attached to Context object. Just like Express, the two objects provide lots of easy ways to help developing. For example:

- `get request.query`
- `get request.hostname`
- `set response.body`
- `set response.status`

### Exception handlering

Another enormous advantage for writing asynchronous code in synchronous way is that it is quite at ease to handler exception. You can catch all the exceptions thrown in the codes followed the convention with `try catch`. We can easily write a customized exception handlering middleware.

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

 Putting the middleware before others, you can catch all the exceptions thrown by the synchronous or asynchronous code.

## Egg inherit from Koa

As the above words, Koa is an excellent framework. However, it is not enough to building an enterprise-class application.

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
exports.handler = ctx => {
  ctx.body = ctx.isIOS
    ? 'Your operating system is iOS.'
    : 'Your operating system is not iOS.';
};
```

More about extension, please check [Exception](../basics/extend.md) section.

### Plugin

As is known to all, Many middlewares are imported to provide different kind of features in Express and Koa. Eg, [koa-session](https://github.com/koajs/session) provides the Session support, [koa-bodyparser](https://github.com/koajs/bodyparser) help to parse request body. Egg has provided a powerful plugin mechanism to make it more easy to write stand alone features.

One plugin can include:

- extend：extend the context of base object, provide utility and attributes.
- middleware：add one or more middlewares, provide pre or post processing logic for request.
- config：configure the default value in different environments.

Stand alone module plugin can provide rich features with high maintenancability. You can almost forget the configuration as the plugin supports configuring the default value in different environments.

[egg-security](https://github.com/eggjs/egg-security) is a typical example.

More about plugin, please check [Plugin](../basics/plugin.md) section.

### Roadmap

#### Egg 1.x

When Egg 1.x released, the Node.js LTS version does not support async function，so Egg 1.x is based on Koa 1.x. On the basis of this, Egg has added full async function support. Egg is completely compatible with middlewares in Koa 2.x, all application could write with `async function`.

- The underlying is based on Koa 1.x, asynchronous solution is based on generator function wrapped by [co].
- Official plugin and core of Egg are written in generator function,  keep supporting Node.js LTS version, use [co] when necessary to be compatiable with async function.
- Application developers can choose either async function (Node.js 7.6+) or generator function (Node.js 6.0+).

#### Egg 2.x

When Node.js 8 became LTS version, async function can used in Node.js without any performance problem. Egg released 2.x based on Koa 2.x, the framework and built-in plugins are all written by async function, and Egg 2.x still keep compatibility with generator function and all the usages in Egg 1.x, applications base on Egg 1.x can migrate to Egg 2.x only by upgrade to Node.js 8.

- The underlying will be based on Koa 2.x, asynchronous solution will be based on async function.
- Official plugin and core of egge will be written in async function.
- Recommend user transfer business layer to async function.
- Only support Node.js 8+.

[co]: https://github.com/tj/co
[Async function]: https://github.com/tc39/ecmascript-asyncawait
[async function]: https://github.com/tc39/ecmascript-asyncawait
