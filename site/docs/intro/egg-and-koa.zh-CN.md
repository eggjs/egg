---
title: Egg.js 与 Koa
order: 1
---

## 异步编程模型

Node.js 是一个异步的世界，官方 API 支持的都是 callback 形式的异步编程模型，这带来了许多问题，例如：

- [callback hell](http://callbackhell.com/)：最臭名昭著的 callback 嵌套问题。
- [release zalgo](https://oren.github.io/#/articles/zalgo/)：异步函数中可能同步调用 callback 返回数据，导致不一致性。

因此，社区提供了各种异步的解决方案。最终，Promise 胜出，并内置到了 ECMAScript 2015 中。基于 Promise 和 Generator 提供的切换上下文能力，出现了 [co] 等第三方类库，让我们以同步的写法来编写异步代码。同时，[async function] 这个官方解决方案也在 ECMAScript 2017 中发布，并在 Node.js 8 中得到实现。

### async function

[async function] 是语言层面提供的语法糖。在 async function 中，我们可通过 `await` 关键字等待一个 Promise 被 resolve（或 reject，在此情况下会抛出异常）。

Node.js 现在的 LTS 版本（8.x）已原生支持 async function。

```js
const fn = async function () {
  const user = await getUser();
  const posts = await fetchPosts(user.id);
  return { user, posts };
};
fn()
  .then(res => console.log(res))
  .catch(err => console.error(err.stack));
```

## Koa

> [Koa](https://koajs.com/) 是一个新的 web 框架，由 Express 幕后的原班人马打造，致力于成为 web 应用和 API 开发领域中的更小、更富有表现力、更健壮的基础设施。

Koa 和 Express 的设计风格十分相似，底层也都是共用[同一套 HTTP 基础库](https://github.com/jshttp)。但它们存在几个明显的区别。除了上面提到的默认异步解决方案之外，Koa 的主要特点还包括以下几个：

### Middleware

Koa 的中间件和 Express 不同，Koa 选择了洋葱圈模型。

- 中间件洋葱图：

![](https://camo.githubusercontent.com/d80cf3b511ef4898bcde9a464de491fa15a50d06/68747470733a2f2f7261772e6769746875622e636f6d2f66656e676d6b322f6b6f612d67756964652f6d61737465722f6f6e696f6e2e706e67)

- 中间件执行顺序图：

![](https://raw.githubusercontent.com/koajs/koa/a7b6ed0529a58112bac4171e4729b8760a34ab8b/docs/middleware.gif)

每个请求在经过一个中间件时都会执行两次，与 Express 形式的中间件相对，Koa 的模型可以方便地实现后置处理逻辑。比较 Koa 与 Express 的 Compress 中间件，便可明显感受到 Koa 中间件模型的优势。

- [koa-compress](https://github.com/koajs/compress/blob/master/lib/index.js) for Koa。
- [compression](https://github.com/expressjs/compression/blob/master/index.js) for Express。

### Context

与 Express 只有 Request 和 Response 两个对象不同，Koa 增加了一个 Context 对象，作为该次请求的上下文对象（在 Koa 1 中为中间件的 `this`，在 Koa 2 中作为中间件的第一个参数传入）。我们可将一次请求相关的上下文全部挂载至此对象上。例如，[traceId](https://github.com/eggjs/egg-tracer/blob/1.0.0/lib/tracer.js#L12) 这种需贯穿整个请求（之后在任何地方进行其他调用都需使用）的属性便可挂载上去。这比单独的 request 和 response 对象更加符合语义。

同时，Context 上也挂载了 Request 和 Response 两个对象。和 Express 类似，两者都提供了许多便捷方法，辅助开发。例如：

- `get request.query`
- `get request.hostname`
- `set response.body`
- `set response.status`

### 异常处理

通过同步方式编写异步代码的另一个很大好处是，异常处理变得非常自然。我们可以使用 `try catch` 来捕获规范编写代码中的所有错误，从而非常容易地编写自定义的错误处理中间件。

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

只需将此中间件放在其他中间件前，便可捕获所有同步或异步代码中抛出的异常。
```
## Egg 继承于 Koa

如上所述，Koa 是一个非常优秀的框架。然而，对于企业级应用来说，它还比较基础。

而 Egg 选择了 Koa 作为其基础框架，在它的模型基础上，对其进行了进一步的增强。

### 扩展

在基于 Egg 的框架或者应用中，我们可以通过定义 `app/extend/{application,context,request,response}.js` 来扩展 Koa 中对应的四个对象的原型。通过这个功能，我们可以快速增加更多的辅助方法。举例，我们在 `app/extend/context.js` 中写入以下代码：

```javascript
// app/extend/context.js
module.exports = {
  get isIOS() {
    const iosReg = /iphone|ipad|ipod/i;
    return iosReg.test(this.get('user-agent'));
  },
};
```

在 Controller 中，我们就可以使用刚才定义的这个便捷属性了：

```javascript
// app/controller/home.js
exports.handler = (ctx) => {
  ctx.body = ctx.isIOS
    ? 'Your operating system is iOS.'
    : 'Your operating system is not iOS.';
};
```

更多关于扩展的内容，请查看[扩展](../basics/extend.md)章节。

### 插件

众所周知，在 Express 和 Koa 中，我们经常会引入众多中间件来提供各种功能，如引入 [koa-session](https://github.com/koajs/session) 提供 Session 支持，引入 [koa-bodyparser](https://github.com/koajs/bodyparser) 解析请求体。Egg 提供了强大的插件机制，让这些独立领域的功能模块更易于编写。

一个插件可以包含：

- extend：扩展基础对象的上下文，提供工具类、属性等。
- middleware：加入一个或多个中间件，提供请求的前置、后置逻辑处理。
- config：配置不同环境下插件的默认配置项。

在一个独立领域下实现的插件，可以在维护性非常高的情况下提供完善的功能。插件还支持配置各个环境下的默认（最佳）配置，使得使用插件时几乎无需修改配置项。

[@eggjs/security](https://github.com/eggjs/security) 插件是一个典型的例子。

更多关于插件的内容，请查看[插件](../basics/plugin.md)章节。

### Egg 与 Koa 的版本关系

#### Egg 1.x

Egg 1.x 发布时，Node.js 的 LTS 版本尚不支持 `async function`，因此 Egg 1.x 基于 Koa 1.x 开发。在此基础上，Egg 全面增加了对 `async function` 的支持。再加上 Egg 对 Koa 2.x 的中间件完全兼容，应用层代码可以完全基于 `async function` 开发。

- 底层基于 Koa 1.x，异步解决方案基于 [co] 封装的 generator function。
- Egg 核心和官方插件使用 generator function 编写，通过 co 包装兼容 async function。
- 开发者可以根据 Node.js 版本选择使用 async function 或 generator function。

#### Egg 2.x

Node.js 8 正式进入 LTS 后，`async function` 在 Node.js 中无性能问题，Egg 2.x 基于 Koa 2.x 开发。框架底层和所有内置插件都采用 `async function` 编写，对 Egg 1.x 和 generator function 保持完全兼容。应用层只需升级到 Node.js 8，即可从 Egg 1.x 迁移到 Egg 2.x。

- 底层基于 Koa 2.x，异步解决方案采用 async function。
- Egg 核心和官方插件使用 async function 编写。
- 建议业务层迁移到 async function 解决方案。
- 仅支持 Node.js 8 及以上版本。

[co]: https://github.com/tj/co
[async function]: https://github.com/tc39/ecmascript-asyncawait
