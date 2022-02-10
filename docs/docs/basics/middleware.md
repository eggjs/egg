---
title: Middleware
order: 5
---

In [the previous chapter](../intro/egg-and-koa.md), we say that Egg is based on Koa, so the form of middleware in Egg is the same as in Koa, i.e. they are both based on [the onion model](../intro/egg-and-koa.md#midlleware).

## Writing Middleware

### How to Write

Let's take a look at how to write a middleware from a simple gzip example.

```js
const isJSON = require('koa-is-json');
const zlib = require('zlib');

async function gzip(ctx, next) {
  await next();

  // convert the response body to gzip after the completion of the execution of subsequent middleware
  let body = ctx.body;
  if (!body) return;
  if (isJSON(body)) body = JSON.stringify(body);

  // set gzip body, correct the response header
  const stream = zlib.createGzip();
  stream.end(body);
  ctx.body = stream;
  ctx.set('Content-Encoding', 'gzip');
}
```

You might find that the middleware's style in the framework is exactly the same as in Koa, yes, any middleware in Koa can be used directly by the framework.

### Configuration

Usually the middleware has its own configuration. In the framework, a complete middleware includes the configuration process. A middleware is a single file placed under `app/middleware` directory, which needs to exports a function that accepts two parameters:

- options: the configuration field of the middleware, `app.config[${middlewareName}]` will be passed in by the framework
- app: the Application instance of current application

We will do a simple optimization to the gzip middleware above, making it do gzip compression only if the body size is greater than a configured threshold. So, we need to create a new file `gzip.js` in `app/middleware` directory.

```js
// app/middleware/gzip.js
const isJSON = require('koa-is-json');
const zlib = require('zlib');

module.exports = (options) => {
  return async function gzip(ctx, next) {
    await next();

    // convert the response body to gzip after the completion of the execution of subsequent middleware
    let body = ctx.body;
    if (!body) return;

    // support options.threshold
    if (options.threshold && ctx.length < options.threshold) return;

    if (isJSON(body)) body = JSON.stringify(body);

    // set gzip body, correct the response header
    const stream = zlib.createGzip();
    stream.end(body);
    ctx.body = stream;
    ctx.set('Content-Encoding', 'gzip');
  };
};
```

## Using Middleware

After writing middleware, we also need to mount it, there are following ways to support:

### Using Middleware in Application

We can load customized middleware completely by configuration in the application, and decide their order.
If we need to load the gzip middleware in the above,
we can edit `config.default.js` like this:

```js
module.exports = {
  // configure the middleware you need, which loads in the order of array
  middleware: ['gzip'],

  // configure the gzip middleware
  gzip: {
    threshold: 1024, // skip response body which size is less than 1K
  },
};
```

This config will be merged to `app.config.appMiddleware` at starting up.

## Using Middleware in Framework and Plugin

Framework and Plugin don't support to configure `middleware` in `config.default.js`, you should mount it in `app.js`:

```js
// app.js
module.exports = (app) => {
  // put to the first place to count request cost
  app.config.coreMiddleware.unshift('report');
};

// app/middleware/report.js
module.exports = () => {
  return async function (ctx, next) {
    const startTime = Date.now();
    await next();
    reportTime(Date.now() - startTime);
  };
};
```

Middlewares which are defined at Application (`app.config.appMiddleware`) and Framework(`app.config.coreMiddleware`) will be merged to `app.middleware` by loader at staring up.

## Using Middleware in Router

The middleware configured in the above ways is global, and it will process every request.

If you do want to take effect only for single route, you could just instantiate and mount it at `app/router.js`:

```js
module.exports = (app) => {
  const gzip = app.middleware.gzip({ threshold: 1024 });
  app.router.get('/needgzip', gzip, app.controller.handler);
};
```

## Default Framework Middleware

In addition to application layer loading middleware, the framework itself and other plugins will also load many middlewares. All the config fields of these built-in middlewares can be modified by modifying the ones with the same name in the config file, for example [Framework Built-in Plugin](https://github.com/eggjs/egg/tree/master/app/middleware) uses a bodyParser middleware(the framework loader will change the various delimiters in the file name into the camel style), and we can add configs below in `config/config.default.js` to modify the bodyParser:

```js
module.exports = {
  bodyParser: {
    jsonLimit: '10m',
  },
};
```

** Note: middleware loaded by the framework and plugins are loaded earlier than those loaded by the application layer, and the application-layer middleware cannot overwrite the default framework middleware. If the application layer loads customized middleware that has the same name with default framework middleware, an error will be reported on starting up. **

## Use Koa's Middleware

Developer is free to use Koa Middleware, all middlewares used in Koa can be directly used in the framework too.

For example, Koa uses [koa-compress](https://github.com/koajs/compress) in this way:

```js
const koa = require('koa');
const compress = require('koa-compress');

const app = koa();

const options = { threshold: 2048 };
app.use(compress(options));
```

We can load the middleware according to the framework specification like this:

```js
// app/middleware/compress.js
// interfaces(`(options) => middleware`) exposed by koa-compress match the framework middleware requirements
module.exports = require('koa-compress');
```

```js
// config/config.default.js
module.exports = {
  middleware: ['compress'],
  compress: {
    threshold: 2048,
  },
};
```

If the third-party Koa middleware do not follow the rule, then you can wrap it yourself:

```js
// config/config.default.js
module.exports = {
  webpack: {
    compiler: {},
    others: {},
  },
};

// app/middleware/webpack.js
const webpackMiddleware = require('some-koa-middleware');

module.exports = (options, app) => {
  return webpackMiddleware(options.compiler, options.others);
};
```

## General Configuration

These general config fields are supported by middleware loaded by the application layer and built in by the framework:

- enable: enable the middleware or not
- match: set some rules with which only the request matches can go through this middleware
- ignore: set some rules with which the request matches can't go through this middleware

### enable

If our application does not need default bodyParser to resolve the request body, we can configure enable for false to close it.

```js
module.exports = {
  bodyParser: {
    enable: false,
  },
};
```

### `match` and `ignore`

match and ignore share the same parameter but do the opposite things. match and ignore cannot be configured in the same time.

If we want gzip to be used only by url requests starting with `/static`, the match config field can be set like this:

```js
module.exports = {
  gzip: {
    match: '/static',
  },
};
```

match and ignore support various types of configuration ways:

1. String: when string, it sets the prefix of a url path, and all urls starting with this prefix will be matched. A string array is also accepted.
2. Regular expression: when regular expression, all urls satisfy this regular expression will be matched.
3. Function: when function, the request context will be passed to it and what it returns(true/false) determines whether the request is matched or not.

```js
module.exports = {
  gzip: {
    match(ctx) {
      // enabled on ios devices
      const reg = /iphone|ipad|ipod/i;
      return reg.test(ctx.get('user-agent'));
    },
  },
};
```

For more configs about `match` and `ignore`, please refer to [egg-path-matching](https://github.com/eggjs/egg-path-matching).
