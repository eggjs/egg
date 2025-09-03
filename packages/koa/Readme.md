# @eggjs/koa

@eggjs/koa is forked from [Koa v2.x](https://github.com/koajs/koa/tree/v2.x) for LTS and drop Node.js < 22.17.1 support.

<img height="240px" src="/docs/logo.png" alt="Koa middleware framework for nodejs"/>

[![NPM version](https://img.shields.io/npm/v/@eggjs/koa.svg?style=flat-square)](https://npmjs.org/package/@eggjs/koa)
[![NPM download](https://img.shields.io/npm/dm/@eggjs/koa.svg?style=flat-square)](https://npmjs.org/package/@eggjs/koa)
[![Node.js CI](https://github.com/eggjs/koa/actions/workflows/node.js.yml/badge.svg?branch=master)](https://github.com/eggjs/koa/actions/workflows/node.js.yml)
[![Test coverage](https://img.shields.io/codecov/c/github/eggjs/koa.svg?style=flat-square)](https://codecov.io/gh/eggjs/koa)
[![Known Vulnerabilities](https://snyk.io/test/npm/@eggjs/koa/badge.svg?style=flat-square)](https://snyk.io/test/npm/@eggjs/koa)

Expressive HTTP middleware framework for node.js to make web applications and APIs more enjoyable to write. Koa's middleware stack flows in a stack-like manner, allowing you to perform actions downstream then filter and manipulate the response upstream.

Only methods that are common to nearly all HTTP servers are integrated directly into Koa's small codebase.
This includes things like content negotiation, normalization of node inconsistencies, redirection, and a few others.

Koa is not bundled with any middleware.

## Installation

@eggjs/koa@3 requires **node v22.18.0** or higher for Node.js LTS support.

```bash
npm install @eggjs/koa
```

## Hello Koa

```ts
import { Application } from '@eggjs/koa';

const app = new Application();

// response
app.use(ctx => {
  ctx.body = 'Hello Koa';
});

app.listen(3000);
```

## Getting started

- [Kick-Off-Koa](https://github.com/koajs/kick-off-koa) - An intro to Koa via a set of self-guided workshops.
- [Workshop](https://github.com/koajs/workshop) - A workshop to learn the basics of Koa, Express' spiritual successor.
- [Introduction Screencast](https://knowthen.com/episode-3-koajs-quickstart-guide/) - An introduction to installing and getting started with Koa

## Middleware

Koa is a middleware framework that can take two different kinds of functions as middleware:

- async function
- common function

Here is an example of logger middleware with each of the different functions:

### **_async_** functions

```ts
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});
```

### Common function

```ts
// Middleware normally takes two parameters (ctx, next), ctx is the context for one request,
// next is a function that is invoked to execute the downstream middleware. It returns a Promise with a then function for running code after completion.

app.use((ctx, next) => {
  const start = Date.now();
  return next().then(() => {
    const ms = Date.now() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
  });
});
```

## Context, Request and Response

Each middleware receives a Koa `Context` object that encapsulates an incoming
http message and the corresponding response to that message. `ctx` is often used
as the parameter name for the context object.

```ts
app.use(async (ctx, next) => {
  await next();
});
```

Koa provides a `Request` object as the `request` property of the `Context`.  
Koa's `Request` object provides helpful methods for working with
http requests which delegate to an [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage)
from the node `http` module.

Here is an example of checking that a requesting client supports xml.

```ts
app.use(async (ctx, next) => {
  ctx.assert(ctx.request.accepts('xml'), 406);
  // equivalent to:
  // if (!ctx.request.accepts('xml')) ctx.throw(406);
  await next();
});
```

Koa provides a `Response` object as the `response` property of the `Context`.  
Koa's `Response` object provides helpful methods for working with
http responses which delegate to a [ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse)
.

Koa's pattern of delegating to Node's request and response objects rather than extending them
provides a cleaner interface and reduces conflicts between different middleware and with Node
itself as well as providing better support for stream handling. The `IncomingMessage` can still be
directly accessed as the `req` property on the `Context` and `ServerResponse` can be directly
accessed as the `res` property on the `Context`.

Here is an example using Koa's `Response` object to stream a file as the response body.

```ts
app.use(async (ctx, next) => {
  await next();
  ctx.response.type = 'xml';
  ctx.response.body = fs.createReadStream('really_large.xml');
});
```

The `Context` object also provides shortcuts for methods on its `request` and `response`. In the prior
examples, `ctx.type` can be used instead of `ctx.response.type` and `ctx.accepts` can be used
instead of `ctx.request.accepts`.

For more information on `Request`, `Response` and `Context`, see the [Request API Reference](docs/api/request.md),
[Response API Reference](docs/api/response.md) and [Context API Reference](docs/api/context.md).

## Koa Application

The object created when executing `new Koa()` is known as the Koa application object.

The application object is Koa's interface with node's http server and handles the registration
of middleware, dispatching to the middleware from http, default error handling, as well as
configuration of the context, request and response objects.

Learn more about the application object in the [Application API Reference](docs/api/index.md).

## Documentation

- [Usage Guide](docs/guide.md)
- [Error Handling](docs/error-handling.md)
- [Koa for Express Users](docs/koa-vs-express.md)
- [FAQ](docs/faq.md)
- [API documentation](docs/api/index.md)

## Troubleshooting

Check the [Troubleshooting Guide](docs/troubleshooting.md) or [Debugging Koa](docs/guide.md#debugging-koa) in
the general Koa guide.

## Running tests

```bash
npm test
```

## Reporting vulnerabilities

To report a security vulnerability, please do not open an issue, as this notifies attackers of the vulnerability. Instead, please email [fengmk2](mailto:fengmk2+eggjs@gmail.com) to disclose.

## Community

- [Examples](https://github.com/koajs/examples)
- [Middleware](https://github.com/koajs/koa/wiki) list
- [Wiki](https://github.com/koajs/koa/wiki)
- [中文文档 v2.x](https://github.com/demopark/koa-docs-Zh-CN)

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/koa)](https://github.com/eggjs/koa/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
