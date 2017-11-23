title: Middleware 中间件
---

在[前面的章节](../intro/egg-and-koa.md)中，我们介绍了 Egg 是基于 Koa 实现的，所以 Egg 的中间件形式和 Koa 的中间件形式是一样的，都是基于[洋葱圈模型](../intro/egg-and-koa.md#midlleware)。每次我们编写一个中间件，就相当于在洋葱外面包了一层。

## 编写中间件

### 写法

我们先来通过编写一个简单的 gzip 中间件，来看看中间件的写法。

```js
// app/middleware/gzip.js
const isJSON = require('koa-is-json');
const zlib = require('zlib');

async function gzip(ctx, next) {
  await next();

  // 后续中间件执行完成后将响应体转换成 gzip
  let body = ctx.body;
  if (!body) return;
  if (isJSON(body)) body = JSON.stringify(body);

  // 设置 gzip body，修正响应头
  const stream = zlib.createGzip();
  stream.end(body);
  ctx.body = stream;
  ctx.set('Content-Encoding', 'gzip');
}
```

可以看到，框架的中间件和 Koa 的中间件写法是一模一样的，所以任何 Koa 的中间件都可以直接被框架使用。

### 配置

一般来说中间件也会有自己的配置。在框架中，一个完整的中间件是包含了配置处理的。我们约定一个中间件是一个放置在 `app/middleware` 目录下的单独文件，它需要 exports 一个普通的 function，接受两个参数：

- options: 中间件的配置项，框架会将 `app.config[${middlewareName}]` 传递进来。
- app: 当前应用 Application 的实例。

我们将上面的 gzip 中间件做一个简单的优化，让它支持指定只有当 body 大于配置的 threshold 时才进行 gzip 压缩，我们要在 `app/middleware` 目录下新建一个文件 `gzip.js`

```js
// app/middleware/gzip.js
const isJSON = require('koa-is-json');
const zlib = require('zlib');

module.exports = options => {
  return async function gzip(ctx, next) {
    await next();

    // 后续中间件执行完成后将响应体转换成 gzip
    let body = ctx.body;
    if (!body) return;

    // 支持 options.threshold
    if (options.threshold && ctx.length < options.threshold) return;

    if (isJSON(body)) body = JSON.stringify(body);

    // 设置 gzip body，修正响应头
    const stream = zlib.createGzip();
    stream.end(body);
    ctx.body = stream;
    ctx.set('Content-Encoding', 'gzip');
  };
};
```

## 使用中间件

中间件编写完成后，我们还需要手动挂载，支持以下方式：

### 在应用中使用中间件

在应用中，我们可以完全通过配置来加载自定义的中间件，并决定它们的顺序。

如果我们需要加载上面的 gzip 中间件，在 `config.default.js` 中加入下面的配置就完成了中间件的开启和配置：

```js
module.exports = {
  // 配置需要的中间件，数组顺序即为中间件的加载顺序
  middleware: [ 'gzip' ],

  // 配置 gzip 中间件的配置
  gzip: {
    threshold: 1024, // 小于 1k 的响应体不压缩
  },
};
```

该配置最终将在启动时合并到 `app.config.appMiddleware`。

### 在框架和插件中使用中间件

框架和插件不支持在 `config.default.js` 中匹配 `middleware`，需要通过以下方式：

```js
// app.js
module.exports = app => {
  // 在中间件最前面统计请求时间
  app.config.coreMiddleware.unshift('report');
};

// app/middleware/report.js
module.exports = () => {
  return async function (ctx, next) {
    const startTime = Date.now();
    await next();
    // 上报请求时间
    reportTime(Date.now() - startTime);
  }
};
```

应用层定义的中间件（`app.config.appMiddleware`）和框架默认中间件（`app.config.coreMiddleware`）都会被加载器加载，并挂载到 `app.middleware` 上。

### router 中使用中间件

以上两种方式配置的中间件是全局的，会处理每一次请求。
如果你只想针对单个路由生效，可以直接在 `app/router.js` 中实例化和挂载，如下：

```js
module.exports = app => {
  const gzip = app.middlewares.gzip({ threshold: 1024 });
  app.router.get('/needgzip', gzip, app.controller.handler);
};
```

## 框架默认中间件

除了应用层加载中间件之外，框架自身和其他的插件也会加载许多中间件。所有的这些自带中间件的配置项都通过在配置中修改中间件同名配置项进行修改，例如[框架自带的中间件](https://github.com/eggjs/egg/tree/master/app/middleware)中有一个 bodyParser 中间件（框架的加载器会将文件名中的各种分隔符都修改成驼峰形式的变量名），我们想要修改 bodyParser 的配置，只需要在 `config/config.default.js` 中编写

```js
module.exports = {
  bodyParser: {
    jsonLimit: '10mb',
  },
};
```

**注意：框架和插件加载的中间件会在应用层配置的中间件之前，框架默认中间件不能被应用层中间件覆盖，如果应用层有自定义同名中间件，在启动时会报错。**

## 使用 Koa 的中间件

框架兼容 Koa 1.x 和 2.x 支持的所有形式的中间件，包括：

- async function: `async (ctx, next) => {}`
- generator function: `function* (next) {}`
- common function: `(ctx, next) => {}`

所有可以在 Koa 中使用的中间件都可以直接在框架中使用。

以 [koa-compress](https://github.com/koajs/compress) 为例，在 Koa 中使用时：

```js
const koa = require('koa');
const compress = require('koa-compress');

const app = koa();

const options = { threshold: 2048 };
app.use(compress(options));
```

我们按照框架的规范来在应用中加载这个 Koa 的中间件：

```js
// app/middleware/compress.js
// koa-compress 暴露的接口(`(options) => middleware`)和框架对中间件要求一致
module.exports = require('koa-compress');
```

```js
// config/config.default.js
module.exports = {
  middleware: [ 'compress' ],
  compress: {
    threshold: 2048,
  },
};
```

## 通用配置

无论是应用层加载的中间件还是框架自带中间件，都支持几个通用的配置项：

- enable：控制中间件是否开启。
- match：设置只有符合某些规则的请求才会经过这个中间件。
- ignore：设置符合某些规则的请求不经过这个中间件。

### enable

如果我们的应用并不需要默认的 bodyParser 中间件来进行请求体的解析，此时我们可以通过配置 enable 为 false 来关闭它

```js
module.exports = {
  bodyParser: {
    enable: false,
  },
};
```

### match 和 ignore

match 和 ignore 支持的参数都一样，只是作用完全相反，match 和 ignore 不允许同时配置。

如果我们想让 gzip 只针对 `/static` 前缀开头的 url 请求开启，我们可以配置 match 选项

```js
module.exports = {
  gzip: {
    match: '/static',
  },
};
```

match 和 ignore 支持多种类型的配置方式

1. 字符串：当参数为字符串类型时，配置的是一个 url 的路径前缀，所有以配置的字符串作为前缀的 url 都会匹配上。
2. 正则：当参数为正则时，直接匹配满足正则验证的 url 的路径。
3. 函数：当参数为一个函数时，会将请求上下文传递给这个函数，最终取函数返回的结果（ture/false）来判断是否匹配。

```js
module.exports = {
  gzip: {
    match(ctx) {
      // 只有 ios 设备才开启
      const reg = /iphone|ipad|ipod/i;
      return reg.test(ctx.get('user-agent'));
    },
  },
};
```
