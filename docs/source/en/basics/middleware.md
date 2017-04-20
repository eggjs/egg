title: Middleware
---

In [the previous chapter](../intro/egg-and-koa.md), we say that Egg is based on Koa 1, so the form of middleware in Egg is the same as in Koa 1, i.e. they are both based on [the onion model](../intro/egg-and-koa.md#midlleware) of generator function.

## Writing Middleware

### how to write

We begin by writing a simple gzip middleware, to see how to write middleware

```js
const isJSON = require('koa-is-json');
const zlib = require('zlib');

function* gzip(next) {
  yield next;

  // convert the response body to gzip after the completion of the execution of subsequent middleware
  let body = this.body;
  if (!body) return;
  if (isJSON(body)) body = JSON.stringify(body);

  // set gzip body, correct the response header
  const stream = zlib.createGzip();
  stream.end(body);
  this.body = stream;
  this.set('Content-Encoding', 'gzip');
}
```

You might find that the middleware's writing style in the framework is exactly the same as in Koa, so any middleware in Koa can be used directly by the framework.

### Configuration

Usually the middleware has its own configuration. In the framework, a complete middleware is including the configuration process. We agree that a middleware is a separate file placed in `app/middleware` directory, which needs an exports function that take two parameters:

- options: the configuration field of the middleware, `app.config[${middlewareName}]` will be passed in by the framework
- app: the Application instance of current application

We will do a simple optimization to the gzip middleware above, making it do gzip compression only if the body size is greater than a configured threshold. So, we need to create a new file `gzip.js` in `app/middleware` directory.

```js
const isJSON = require('koa-is-json');
const zlib = require('zlib');

module.exports = options => {
  return function* gzip(next) {
    yield next;

    // convert the response body to gzip after the completion of the execution of subsequent middleware
    let body = this.body;
    if (!body) return;

    // support options.threshold
    if (options.threshold && this.length < options.threshold) return;

    if (isJSON(body)) body = JSON.stringify(body);

    // set gzip body, correct the response header
    const stream = zlib.createGzip();
    stream.end(body);
    this.body = stream;
    this.set('Content-Encoding', 'gzip');
  };
};
```

## Importing Middleware in the Application

We can import customized middleware completely by configuration in the application, and decide their order.
If we need to import the gzip Middleware in the above, 
we can edit `config.default.js` like this:

```js
module.exports = {
  // configure the middleware you need, which loads in the order of array
  middleware: [ 'gzip' ],

  // configure the gzip middleware
  gzip: {
    threshold: 1024, // skip response body which size is less than 1K
  },
};
```

** About Configuration fields and runtime environment configurations, see [Config](./config.md) chapter. **

## Default Framework Middleware

In addition to the application layer middleware is imported, the framework itself and other plug-ins will also import many middleware. All the config fields of these built-in middlewares can be modified by modifying the ones with the same name in the config file, for example [Framework Built-in Plugin](https://github.com/eggjs/egg/tree/master/app/middleware) uses a bodyParser middleware(the framework loader will change the file name separated by delimiters into the camel style), and we can add configs below in `config/config.default.js` to modify the bodyParser:

```js
module.exports = {
  bodyParser: {
    jsonLimit: '10m',
  },
};
```
** Note: middleware imported by the framework and plugins are loaded earlier than those imported by the application layer, and the application layer cannot overwrite the default framework middleware. If the application layer imports customized middleware that has the same name with default framework middleware, an error will be raised on starting up. **

## The Use of Middleware in Router

Both middleware defined by the application layer and the default framework middleware will be loaded by the loader and are mounted to `app.middlewares`(Note: it's plural here since `app.middleware` is used for other purpose in Koa). So middleware defined by the application layer can be imported by the router other than the config, therefore they only take effect on the corresponding routes.

Again, let's take the gzip middleware above for an example. In order to use this middleware directly in the router, we can write like this in `app/router.js`:

```js
module.exports = app => {
  const gzip = app.middlewares.gzip({ threshold: 1024 });
  app.get('/needgzip', gzip, app.controller.handler);
};
```

## Use Koa's Middleware

The framework is compatible with all kinds of middleware of Koa 1.x and 2.x, including: 
- generator function: `function* (next) {}`
- async function: `async (ctx, next) => {}`
- common function: `(ctx, next) => {}`

All middleware used by Koa can be directly used by the framework, too.

For example, Koa uses [koa-compress](https://github.com/koajs/compress) in this way:

```js
const koa = require('koa');
const compress = require('koa-compress');

const app = koa();

const options = { threshold: 2048 };
app.use(compress(options));
```

We can import the middleware according to the framework specification like this:

```js
// app/middleware/compress.js

// interfaces(`(options) => middleware`) exposed by koa-compress match the framework middleware requirements
module.exports = require('koa-compress');
```

```js
// config/config.default.js

exports.middleware = [ 'compress' ];
exports.compress = {
  threshold: 2048,
};
```
## General Configuration

These general config fields are supported by middleware imported by the application layer or built in by the framework:

- enable: enable the middleware or not
- match: set some rules with which only the request match can go through middleware
- ignore: set some rules with which the request match can't go through this middleware

### enable

If our application does not need default bodyParser to resolve the request body, we can configure enable to close it.

```js
module.exports = {
  bodyParser: {
    enable: false,
  },
};
```

### match and ignore

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

1. String: when string, it sets the prefix of a url path, and all urls starting with this prefix will match.
2. Regular expression: when regular expression, all urls satisfy this regular expression will match.
3. Function: when function, the request context will be passed to it and what it returns(true/false) determines whether the request matches or not.

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
