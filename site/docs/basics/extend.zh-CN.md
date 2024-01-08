框架提供了多种扩展点以扩展自身的功能：

- Application
- Context
- Request
- Response
- Helper

在开发中，我们既可以使用已有的扩展 API 来方便开发，也可以对以上对象进行自定义扩展，以进一步加强框架的功能。

## Application

`app` 对象是指 Koa 的全局应用对象，全局唯一，在应用启动时创建。

### 访问方式

- 通过 `ctx.app` 访问
- 在 Controller、Middleware、Helper、Service 中可以通过 `this.app` 访问 Application 对象，例如 `this.app.config` 用于访问配置对象。
- 在 `app.js` 中，`app` 对象作为入口函数的第一个参数：

  ```js
  // app.js
  module.exports = app => {
    // 在这里可以使用 app 对象
  };
  ```

### 扩展方式

框架将 `app/extend/application.js` 中定义的对象与 Koa Application 的 prototype 对象合并。在应用启动时，会基于扩展后的 prototype 生成 `app` 对象。

#### 方法扩展

例如，要增加一个 `app.foo()` 方法：

```js
// app/extend/application.js
module.exports = {
  foo(param) {
    // this 即 app 对象，在这里可以调用 app 上的其他方法或访问属性
  },
};
```

#### 属性扩展

通常属性只需计算一次，应实现缓存，避免多次访问时重复计算，降低性能。

推荐使用 Symbol + Getter 模式。

例如，增加一个 `app.bar` 属性 Getter：

```js
// app/extend/application.js
const BAR = Symbol('Application#bar');

module.exports = {
  get bar() {
    // this 即 app 对象，在这里可以调用 app 上的其他方法或访问属性
    if (!this[BAR]) {
      // 实际情况肯定更复杂
      this[BAR] = this.config.xx + this.config.yy;
    }
    return this[BAR];
  },
};
```
## Context

Context 是指 Koa 的请求上下文，这是请求级别的对象。每次请求生成一个 Context 实例，通常简写为 `ctx`。在所有文档中，Context 和 `ctx` 均指 Koa 的上下文对象。

### 访问方式

- 在 middleware 中，`this` 就是 `ctx`，例如 `this.cookies.get('foo')`。
- 在 controller 中，类的写法通过 `this.ctx` 访问，方法的写法则直接通过 `ctx` 参数访问。
- 在 helper 和 service 中，`this` 指向 helper 或 service 对象本身，通过 `this.ctx` 访问 context 对象，例如 `this.ctx.cookies.get('foo')`。

### 扩展方式

框架将 `app/extend/context.js` 中定义的对象与 Koa Context 的 prototype 对象合并。在处理请求时，会基于扩展后的 prototype 生成 `ctx` 对象。

#### 方法扩展

例如，要增加一个 `ctx.foo()` 方法：

```js
// app/extend/context.js
module.exports = {
  foo(param) {
    // this 即 ctx 对象，在这里可以调用 ctx 上的其他方法或访问属性
  },
};
```

#### 属性扩展

通常属性在同一次请求中只需计算一次，应实现缓存，避免同一请求中多次访问时重复计算，降低性能。

推荐使用 Symbol + Getter 模式。

例如，增加一个 `ctx.bar` 属性 Getter：

```js
// app/extend/context.js
const BAR = Symbol('Context#bar');

module.exports = {
  get bar() {
    // this 即 ctx 对象，在这里可以调用 ctx 上的其他方法或访问属性
    if (!this[BAR]) {
      // 例如，从 header 中获取，实际情况肯定更复杂
      this[BAR] = this.get('x-bar');
    }
    return this[BAR];
  },
};
```

## Request

Request 对象与 Koa 的 Request 对象相同，是请求级别的对象。它提供了众多请求相关的属性和方法供使用。

### 访问方式

通过 `ctx.request` 访问：

```js
ctx.request;
```

`ctx` 上的许多属性和方法都代理到了 `request` 对象上。因此，直接通过 `ctx` 或通过 `request` 访问这些属性和方法是等价的，例如 `ctx.url === ctx.request.url`。

Koa 内置的代理 `request` 的属性和方法列表可以参见：[Koa - Request aliases](http://koajs.com/#request-aliases)。

### 扩展方式

框架会把 `app/extend/request.js` 中定义的对象与内置 `request` 的 prototype 对象合并，在处理请求时会基于扩展后的 prototype 生成 `request` 对象。

例如，增加一个 `request.foo` 属性 Getter：

```js
// app/extend/request.js
module.exports = {
  get foo() {
    return this.get('x-request-foo');
  },
};
```

## Response

Response 对象与 Koa 的 Response 对象相同，是请求级别的对象。它提供了众多响应相关的属性和方法供使用。

### 访问方式

通过 `ctx.response` 访问：

```js
ctx.response;
```

`ctx` 上的许多属性和方法都代理到了 `response` 对象上。因此，直接通过 `ctx` 或通过 `response` 访问这些属性和方法是等价的，例如 `ctx.status = 404` 与 `ctx.response.status = 404` 是等价的。

Koa 内置的代理 `response` 的属性和方法列表可以参见：[Koa - Response aliases](http://koajs.com/#response-aliases)。

### 扩展方式

框架会把 `app/extend/response.js` 中定义的对象与内置 `response` 的 prototype 对象合并，在处理请求时会基于扩展后的 prototype 生成 `response` 对象。

例如，增加一个 `response.foo` 属性 setter：

```js
// app/extend/response.js
module.exports = {
  set foo(value) {
    this.set('x-response-foo', value);
  },
};
```

使用方式：`this.response.foo = 'bar';`

## Helper

Helper 函数用来提供一系列实用的工具函数。它们的作用是将一些常用动作抽离到 `helper.js` 中，形成独立的函数。这样可以用 JavaScript 编写复杂逻辑，避免逻辑分散。此外，Helper 函数便于编写测试用例。

框架内置了一些常用的 Helper 函数，同时也支持自定义 Helper 函数。

### 访问方式

可以通过 `ctx.helper` 访问 helper 对象，例如：

```js
// 假设在 app/router.js 中定义了 home 路由
app.get('home', '/', 'home.index');

// 使用 helper 计算指定的 url 路径
ctx.helper.pathFor('home', { by: 'recent', limit: 20 });
// => /?by=recent&limit=20
```

### 扩展方式

框架会把 `app/extend/helper.js` 中定义的对象与内置 `helper` 的 prototype 对象合并，在处理请求时会基于扩展后的 prototype 生成 `helper` 对象。

例如，要增加一个 `helper.foo()` 方法：

```js
// app/extend/helper.js
module.exports = {
  foo(param) {
    // this 是 helper 对象，在这里可以调用其他 helper 方法
    // this.ctx => context 对象
    // this.app => application 对象
  },
};
```

## 按照环境进行扩展

可以根据不同的环境选择性地进行扩展。例如，仅在 `unittest` 环境中提供 `mockXX()` 方法，以便于进行 mock 测试。

```js
// app/extend/application.unittest.js
module.exports = {
  mockXX(k, v) {
    // mock 方法实现
  },
};
```

这个文件只会在 `unittest` 环境下加载。类似地，Application、Context、Request、Response 和 Helper 都可以采用这种方式根据特定环境进行扩展。更多信息请参见[运行环境](./env.md)。
