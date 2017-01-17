title: 中间件
---

在[前面的章节](../intro/egg-and-koa.md)中，我们介绍了 egg 是基于 koa 1 实现的，所以 egg 的中间件形式和 koa 1 的中间件形式是一样的，都是基于 generator function 的[洋葱圈模型](../intro/egg-and-koa.md#midlleware)。每次我们编写一个中间件，就相当于在洋葱外面包了一层。

## 编写中间件

### 写法

我们先来通过编写一个简单的 gzip 中间件，来看看中间件的写法。

```js
const isJSON = require('koa-is-json');
const zlib = require('zlib');

function* gzip(next) {
  yield next;

  // 后续中间件执行完成后将响应体转换成 gzip
  const body = this.body;
  if（!body) return;
  if (isJSON(body)) body = JSON.stringify(body);

  // 设置 gzip body，修正响应头
  this.body = zlib.createGzip().end(body);
  this.set('Content-Encoding', encoding);
}
```

可以看到，egg 的中间件和 koa 1 的中间件写法是一模一样的，所以任何 koa 1 的中间件都可以直接被 egg 使用。

### 配置

一般来说中间件也会有自己的配置。在框架中，一个完整的中间件是包含了配置处理的。我们约定一个中间件是一个放置在 `app/middleware` 目录下的单独文件，它需要 exports 一个普通的 function，接受两个参数：

- options: 中间件的配置项，框架会将 `app.config[${middlewareName}]` 传递进来。
- app: 当前应用 Application 的实例。

我们将上面的 gzip 中间件做一个简单的优化，让它支持指定只有当 body 大于配置的 threshold 时才进行 gzip 压缩，我们要在 `app/middleware` 目录下新建一个文件 `gzip.js`

```js
const isJSON = require('koa-is-json');
const zlib = require('zlib');

module.exports = (options, app) => {
  return function* gzip(next) {
    yield next;

    // 后续中间件执行完成后将响应体转换成 gzip
    const body = this.body;
    if（!body) return;

    // 支持 options.threshold
    if (options.threshold && this.length < options.threshold) return;

    if (isJSON(body)) body = JSON.stringify(body);

    // 设置 gzip body，修正响应头
    this.body = zlib.createGzip().end(body);
    this.set('Content-Encoding', encoding);
  };
};
```

## 在应用中引入中间件

在应用中，我们可以完全通过配置来引入自定义的中间件，并决定它们的顺序。

如果我们需要引入上面的 gzip 中间件，在 `config.default.js` 中加入下面的配置就完成了中间件的开启和配置：

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

**配置项以及区分各运行环境的配置，请查看[配置](./config.md)章节。**

## 框架默认中间件

除了应用层引入中间件之外，框架自身和其他的插件也会引入许多中间件。所有的这些自带中间件的配置项都通过在配置中修改中间件同名配置项进行修改，例如 [egg 自带的中间件](https://github.com/eggjs/egg/tree/master/app/middleware)中有一个 bodyParser 中间件（框架的加载器会将文件名中的各种分隔符都修改成驼峰形式的变量名），我们想要修改 bodyParser 的配置，只需要在 `config/config.default.js` 中编写

```js
module.exports = {
  bodyParser: {
    jsonLimit: '10m',
  },
};
```

**注意：框架和插件引入的中间件会在应用层配置的中间件之前，框架默认中间件不能被应用层中间件覆盖，如果应用层有自定义同名中间件，在启动时会报错。**

## router 中使用中间件

应用层定义的中间件和框架默认中间件都会被加载器加载，并挂载到 `app.middlewares` 上（注意：此处为复数，因为 `app.middleware` 在 koa 中另有用处），所以应用层定义的中间件可以不通过配置引入，而是在 router 中引入，从而只对对应的路由生效。

还是拿刚才的 gzip 中间件举例，当我们想直接在 router 中使用的时候，在 `app/router.js` 中就可以这样写

```js
module.exports = app => {
  const gzip = app.middlewares.gzip({ threshold: 1024 });
  app.get('/needgzip', gzip, app.controller.handler);
}
```

## 通用配置

无论是应用层中间件还是框架自带中间件，都支持几个通用的配置项：

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

### match & ignore

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
