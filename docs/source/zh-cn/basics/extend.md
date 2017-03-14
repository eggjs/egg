title: 框架扩展
---

框架提供了多种扩展点扩展自身的功能：

- Application
- Context
- Request
- Response
- Helper

在开发中，我们既可以使用已有的扩展 API 来方便开发，也可以对以上对象进行自定义扩展，进一步加强框架的功能。

## Application

`app` 对象指的是 Koa 的全局应用对象，全局只有一个，在应用启动时被创建。

### 访问方式

- `ctx.app`
- Controller，Middleware，Helper，Service 中都可以通过 `this.app` 访问到 Application 对象，例如 `this.app.config` 访问配置对象。
- 在 `app.js` 中 `app` 对象会作为第一个参数注入到入口函数中

   ```js
   // app.js
   module.exports = app => {
     // 使用 app 对象
   };
   ```

### 扩展方式

框架会把 `app/extend/application.js` 中定义的对象与 Koa Application 的 prototype 对象进行合并，在应用启动时会基于扩展后的 prototype 生成 `app` 对象。

#### 方法扩展

例如，我们要增加一个 `app.foo()` 方法：

```js
// app/extend/application.js
module.exports = {
  foo(param) {
    // this 就是 app 对象，在其中可以调用 app 上的其他方法，或访问属性
  },
};
```

#### 属性扩展

一般来说属性的计算只需要进行一次，那么一定要实现缓存，否则在多次访问属性时会计算多次，这样会降低应用性能。

推荐的方式是使用 Symbol + Getter 的模式。

例如，增加一个 `app.bar` 属性 Getter：

```js
// app/extend/application.js
const BAR = Symbol('Application#bar');

module.exports = {
  get bar() {
    // this 就是 app 对象，在其中可以调用 app 上的其他方法，或访问属性
    if (!this[BAR]) {
      // 实际情况肯定更复杂
      this[BAR] = this.config.xx + this.config.yy;
    }
    return this[BAR];
  },
};
```

## Context

Context 指的是 Koa 的请求上下文，这是 **请求级别** 的对象，每次请求生成一个 Context 实例，通常我们也简写成 `ctx`。在所有的文档中，Context 和 `ctx` 都是指 Koa 的上下文对象。

### 访问方式

- middleware 中 `this` 就是 ctx，例如 `this.cookies.get('foo')`。
- controller 有两种写法，类的写法通过 `this.ctx`，方法的写法直接通过 `ctx` 入参。
- helper，service 中的 this 指向 helper，service 对象本身，使用 `this.ctx` 访问 context 对象，例如 `this.ctx.cookies.get('foo')`。

### 扩展方式

框架会把 `app/extend/context.js` 中定义的对象与 Koa Context 的 prototype 对象进行合并，在处理请求时会基于扩展后的 prototype 生成 ctx 对象。

#### 方法扩展

例如，我们要增加一个 `ctx.foo()` 方法：

```js
// app/extend/context.js
module.exports = {
  foo(param) {
    // this 就是 ctx 对象，在其中可以调用 ctx 上的其他方法，或访问属性
  },
};
```

#### 属性扩展

一般来说属性的计算在同一次请求中只需要进行一次，那么一定要实现缓存，否则在同一次请求中多次访问属性时会计算多次，这样会降低应用性能。

推荐的方式是使用 Symbol + Getter 的模式。

例如，增加一个 `ctx.bar` 属性 Getter：

```js
// app/extend/context.js
const BAR = Symbol('Context#bar');

module.exports = {
  get bar() {
    // this 就是 ctx 对象，在其中可以调用 ctx 上的其他方法，或访问属性
    if (!this[BAR]) {
      // 例如，从 header 中获取，实际情况肯定更复杂
      this[BAR] = this.get('x-bar');
    }
    return this[BAR];
  },
};
```

## Request

Request 对象和 Koa 的 Request 对象相同，是 **请求级别** 的对象，它提供了大量请求相关的属性和方法供使用。

### 访问方式

```js
ctx.request
```

`ctx` 上的很多属性和方法都被代理到 `request` 对象上，对于这些属性和方法使用 `ctx` 和使用 `request` 去访问它们是等价的，例如 `ctx.url === ctx.request.url`。

Koa 内置的代理 `request` 的属性和方法列表：[Koa - Request aliases](http://koajs.com/#request-aliases)

### 扩展方式

框架会把 `app/extend/request.js` 中定义的对象与内置 `request` 的 prototype 对象进行合并，在处理请求时会基于扩展后的 prototype 生成 `request` 对象。

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

Response 对象和 Koa 的 Response 对象相同，是 **请求级别** 的对象，它提供了大量响应相关的属性和方法供使用。

### 访问方式

```js
ctx.response
```

ctx 上的很多属性和方法都被代理到 `response` 对象上，对于这些属性和方法使用 `ctx` 和使用 `response` 去访问它们是等价的，例如 `ctx.status = 404` 和 `ctx.response.status = 404` 是等价的。

Koa 内置的代理 `response` 的属性和方法列表：[Koa Response aliases](http://koajs.com/#response-aliases)

### 扩展方式

框架会把 `app/extend/response.js` 中定义的对象与内置 `response` 的 prototype 对象进行合并，在处理请求时会基于扩展后的 prototype 生成 `response` 对象。

例如，增加一个 `response.foo` 属性 setter：

```js
// app/extend/response.js
module.exports = {
  set foo(value) {
    this.set('x-response-foo', value);
  },
};
```

就可以这样使用啦：`this.response.foo = 'bar';`

## Helper

Helper 函数用来提供一些实用的 utility 函数。

它的作用在于我们可以将一些常用的动作抽离在 helper.js 里面成为一个独立的函数，这样可以用 JavaScript 来写复杂的逻辑，避免逻辑分散各处。另外还有一个好处是 Helper 这样一个简单的函数，可以让我们更容易编写测试用例。

框架内置了一些常用的 Helper 函数。我们也可以编写自定义的 Helper 函数。

### 访问方式

通过 `ctx.helper` 访问到 helper 对象，例如：

```js
// 假设在 app/router.js 中定义了 home router
app.get('home', '/', 'home.index');

// 使用 helper 计算指定 url path
ctx.helper.pathFor('home', { by: 'recent', limit: 20 })
// => /?by=recent&limit=20
```

### 扩展方式

框架会把 `app/extend/helper.js` 中定义的对象与内置 `helper` 的 prototype 对象进行合并，在处理请求时会基于扩展后的 prototype 生成 `helper` 对象。

例如，增加一个 `helper.foo()` 方法：

```js
// app/extend/helper.js
module.exports = {
  foo(param) {
    // this 是 helper 对象，在其中可以调用其他 helper 方法
    // this.ctx => context 对象
    // this.app => application 对象
  },
};
```


## 按照环境进行扩展

另外，还可以根据环境进行有选择的扩展，例如，只在 unittest 环境中提供 `mockXX()` 方法以便进行 mock 方便测试。

```js
// app/extend/application.unittest.js
module.exports = {
  mockXX(k, v) {
  }
};
```

这个文件只会在 unittest 环境加载。

同理，对于 Application，Context，Request，Response，Helper 都可以使用这种方式针对某个环境进行扩展，更多参见[运行环境](./env.md)。
