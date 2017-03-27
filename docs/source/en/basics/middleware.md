title: Middleware
---

In [the previous chapter](../intro/egg-and-koa.md), we say that Egg is based on Koa 1, so the form of middleware in Egg is the same as in Koa 1, i.e. they are both based on generator function's [the onion model](../intro/egg-and-koa.md#midlleware).

## Customize Middleware

### Syntax

We'll showing the middleware syntax below by customizing a simple gzip middleware.

```js
const isJSON = require('koa-is-json');
const zlib = require('zlib');

function* gzip(next) {
  yield next;

  // convert the reaponse body to gzip after remaining middleware completed
  let body = this.body;
  if (!body) return;
  if (isJSON(body)) body = JSON.stringify(body);

  // set gzip body by changing the reponse header
  const stream = zlib.createGzip();
  stream.end(body);
  this.body = stream;
  this.set('Content-Encoding', 'gzip');
}
```

You might find that the middleware syntax in the framework is exactly the same as in Koa, so any middleware in Koa can be used directly by the framework.

### Config

Usually the middleware has its own config. In the framework, processing config is a part of a complete middleware. As a convention, a middleware is an individual file in `app/middleware` exporting a plain function that accepting 2 paramters:

- options: the config field of the middleware, `app.config[${middlewareName}]` will be passed in by the frame
- app: the Application instance of current application

We will optimize the gzip middleware above to make it do gzip compress only if the body size is greater than a configured threshold so, as we mentioned above, we'll create a new file `gzip.js` in `app/middleware`.

```js
const isJSON = require('koa-is-json');
const zlib = require('zlib');

module.exports = options => {
  return function* gzip(next) {
    yield next;

    // convert the reaponse body to gzip after remaining middleware completed
    let body = this.body;
    if (!body) return;

    // support options.threshold
    if (options.threshold && this.length < options.threshold) return;

    if (isJSON(body)) body = JSON.stringify(body);

    // set gzip body by changing the reponse header
    const stream = zlib.createGzip();
    stream.end(body);
    this.body = stream;
    this.set('Content-Encoding', 'gzip');
  };
};
```

## Importing Middlewares in Application

We can import customized middlewares simply by config in the application, further more, the orders can also be set.

In order to enable and config the gzip middleware above, everything you need to do is to add configs below to `config.default.js` only:

```js
module.exports = {
  // config middlewares you need, loading in the order of array
  middleware: [ 'gzip' ],

  // config the gzip middleware
  gzip: {
    threshold: 1024, // skip bodies less than 1K
  },
};
```

** Config fields and runtime environment dependent configs refers to the [Config](./config.md) chapter. **

## Framework Default Middlewares

Despite the application layer imported middlewares, the framework and other plugins may also import middlewares. All the config fields of these built-in middlewares can be changed by ones with the same name in the config file, for example [Framework Built-in Plugin](https://github.com/eggjs/egg/tree/master/app/middleware) uses a bodyParser middleware(the framework loader will change the file name separated by delimiters into the camel style), and we can add configs below in `config/confg.default.js` to config the bodyParser:

```js
module.exports = {
  bodyParser: {
    jsonLimit: '10m',
  },
};
```
**Note: middlewares imported by the framework and plugins are loaded earlier than those imported by the application layer, and the application layer cannot overwrite the framework default middlewares. If the application layer imports a customized middleware that has the same name with a framework default middleware, an error will be raised on starting up. **

## Middlewares in Router

Middlewares defined by the application layer and the framework default middlewares both are loaded by the loader and are mounted to `app.middlewares`(Note: it's plural here since `app.middleware` is used for other purpose in Koa). So middlewares defined by the application layer can be imported by the router other than the config, therefore they only affect the corresponding routes.

Again, let's take the gzip middleware above for an example. In order to use this middleware directly in the router, these lines below should be put to `app/router.js`:

```js
module.exports = app => {
  const gzip = app.middlewares.gzip({ threshold: 1024 });
  app.get('/needgzip', gzip, app.controller.handler);
};
```

## Use Koa's Middlewares

The framework are capable with all kinds of middlewares of Koa 1.x and 2.x, including: 
- generator function: `function* (next) {}`
- async function: `async (ctx, next) => {}`
- common function: `(ctx, next) => {}`

All middlewares used by Koa can be directly used by the framework, too.

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
## General configs

These general config fields are supported by middlewares despite of being imported by the application layer or built in by the framework:

- enable: enable the middleware or not
- match: set the rule with which the request must match in order to use this middleware
- ignore: set the rule with which the request must match in order NOT to use this middleware

### enable

We can prevent the default bodyParse middleware from parsing the request body if our application needs to by setting enable a false value.

```js
module.exports = {
  bodyParser: {
    enable: false,
  },
};
```

### match & ignore

match and ignore share the same parameter but do the opposite things. match and ignore cannot be configured in the same time.

If we want gzip to be used only by url requests starting with `/static`, the match config field can be set like this:

```js
module.exports = {
  gzip: {
    match: '/static',
  },
};
```
match and ignore can be configured in different ways:

1. string: when string, it sets the prefix of a url path, and all urls starting with this prefix will match.
2. regular expression: when regular expression, all urls satisfy this regular expression will match.
3. function: when function, the request context is passed to it and what it returns(true/false) determins whether the request matches or not.

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
