title: Egg.js 与 Koa
---

## 异步编程模型

Node.js 是一个异步的世界，官方 API 支持的都是 callback 形式的异步编程模型，这会带来许多问题，例如

- [callback hell](http://callbackhell.com/): 最臭名昭著的 callback 嵌套问题。
- [release zalgo](https://oren.github.io/blog/zalgo.html): 异步函数中可能同步调用 callback 返回数据，带来不一致性。

因此社区提供了各种异步的解决方案，最终胜出的是 Promise，它也内置到了 ECMAScript 2015 中。而在 Promise 的基础上，结合 Generator 提供的切换上下文能力，出现了 [co] 等第三方类库来让我们用同步写法编写异步代码。同时，[async function] 这个官方解决方案也已经定稿，将于 ECMAScript 2016 中发布。

### Generator 和 co

#### 基于 Generator 和 Promise 提供同步写法的异步模型

上面提到，基于 Promise 和 Generator 可以实现用同步的方式编写异步代码，实现这个功能最广为人知的库就是 [co]，其实它的核心原理就是下面这几行。

```js
function run(generator, res) {
  const ret = generator.next(res);
  if (ret.done) return;
  ret.value.then(function (res) {
    run(generator, res);
  });
}
```

通过这段代码，可以在 Generator Function 中来 yield 一个 Promise，并等待它 resolve 之后再执行后面的代码。

```js
let count = 1;
function tick(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      console.log('tick %s after %s ms', count++, time);
      resolve();
    }, time);
  });
}

function* main() {
  console.log('start run...');
  yield tick(500);
  yield tick(1000);
  yield tick(2000);
}

run(main());
```

通过 run 这个驱动器，上面例子中的 main 中的异步代码就可以完全通过同步的写法完成了。对 Generator 更详细的讲解，可以查看[这篇文档和示例](https://github.com/dead-horse/koa-step-by-step#generator)。

[co] 相比于上面提到的那个 run 函数而言，加了支持 `yield [Object / Array / thunk / Generator Function / Generator]`，wrap 一个 Generator Function 成 Promise 等功能。而 co 也是 Koa 1 选择的底层异步库，所有的 Koa 1 的中间件都必须是一个 `generator function`。

### async function

[async function] 的原理其实和 [co] 类似，但它是语言层面提供的语法糖，通过 async function 编写的代码和 co + generator 编写的代码看起来很类似。

```js
const fn = co(function*() {
  const user = yield getUser();
  const posts = yield fetchPosts(user.id);
  return { user, posts };
});
fn().then(res => console.log(res)).catch(err => console.error(err.stack));
```

```js
const fn = async function() {
  const user = await getUser();
  const posts = await fetchPosts(user.id);
  return { user, posts };
};
fn().then(res => console.log(res)).catch(err => console.error(err.stack));
```

相较于 co 支持的种类，async function 不能直接 await 一个 `Promise` 数组（可以通过 `Promise.all` 来封装），也不能 await `thunk`。

async function 虽然尚未随着规范发布，但是 Node.js 7.x 中带的 V8 版本已经支持，且从 7.6.0 开始将不再需要打开 flag 而直接使用。

## Koa

> Koa is a new Web framework designed by the team behind Express, which aims to be a smaller, more expressive, and more robust foundation for Web applications and APIs.

Koa 和 Express 的设计风格非常类似，底层也都是共用的[同一套 HTTP 基础库](https://github.com/jshttp)，但是有几个显著的区别，除了上面提到的默认异步解决方案之外，主要的特点还有下面几个。

### Midlleware

Koa 的中间件和 Express 不同，Koa 选择了洋葱圈模型。

- 中间件洋葱图：

![](https://camo.githubusercontent.com/d80cf3b511ef4898bcde9a464de491fa15a50d06/68747470733a2f2f7261772e6769746875622e636f6d2f66656e676d6b322f6b6f612d67756964652f6d61737465722f6f6e696f6e2e706e67)

- 中间件执行顺序图：

![](https://raw.githubusercontent.com/koajs/koa/a7b6ed0529a58112bac4171e4729b8760a34ab8b/docs/middleware.gif)

所有的请求经过一个中间件的时候都会执行两次，对比 Express 形式的中间件，Koa 的模型可以非常方便的实现后置处理逻辑，对比 Koa 和 Express 的 Compress 中间件就可以明显的感受到 Koa 中间件模型的优势。

- [koa-compress](https://github.com/koajs/compress/blob/master/index.js) for Koa.
- [compression](https://github.com/expressjs/compression/blob/master/index.js) for Express.

### Context

和 Express 只有 Request 和 Response 两个对象不同，Koa 增加了一个 Context 的对象，作为这次请求的上下文对象（在 Koa 1 中为中间件的 `this`，在 Koa 2 中作为中间件的第一个参数传入）。我们可以将一次请求相关的上下文都挂载到这个对象上。类似 [traceId](https://github.com/eggjs/egg-tracer/blob/1.0.0/lib/tracer.js#L12) 这种需要贯穿整个请求（在后续任何一个地方进行其他调用都需要用到）的属性就可以挂载上去。相较于 request 和 response 而言更加符合语义。

同时 Context 上也挂载了 Request 和 Response 两个对象。和 Express 类似，这两个对象都提供了大量的便捷方法辅助开发，例如

- `get request.query`
- `get request.hostname`
- `set response.body`
- `set response.status`

### 异常处理

通过同步方式编写异步代码带来的另外一个非常大的好处就是异常处理非常自然，使用 `try catch` 就可以将按照规范编写的代码中的所有错误都捕获到。这样我们可以很便捷的编写一个自定义的错误处理中间件。

```js
function* onerror(next) {
  try {
    yield next;
  } catch (err) {
    this.app.emit('error', err);
    this.body = 'server error';
    this.status = err.status || 500;
  }
}
```

只需要将这个中间件放在其他中间件之前，就可以捕获它们所有的同步或者异步代码中抛出的异常了。

## Egg 继承于 Koa

如上述，Koa 是一个非常优秀的框架，然而对于企业级应用来说，它还比较基础。

而 Egg 选择了 Koa 作为其基础框架，在它的模型基础上，进一步对它进行了一些增强。

### 扩展

在基于 Egg 的框架或者应用中，我们可以通过定义 `app/extend/{application,context,request,response}.js` 来扩展 Koa 中对应的四个对象的原型，通过这个功能，我们可以快速的增加更多的辅助方法，例如我们在 `app/extend/context.js` 中写入下列代码：

```js
// app/extend/context.js
module.exports = {
  get isIOS() {
    const iosReg = /iphone|ipad|ipod/i;
    return iosReg.test(this.get('user-agent'));
  },
};
```

在 Controller 中，我们就可以使用到刚才定义的这个便捷属性了：

```js
// app/controller/home.js
exports.handler = function* (ctx) {
  ctx.body = this.isIOS
    ? 'Your operating system is iOS.'
    : 'Your operating system is not iOS.';
};
```

更多关于扩展的内容，请查看[扩展](../basics/extend.md)章节。

### 插件

众所周知，在 Express 和 Koa 中，经常会引入许许多多的中间件来提供各种各样的功能，例如引入 [koa-session](https://github.com/koajs/session) 提供 Session 的支持，引入 [koa-bodyparser](https://github.com/koajs/bodyparser) 来解析请求 body。而 Egg 提供了一个更加强大的插件机制，让这些独立领域的功能模块可以更加容易编写。

一个插件可以包含

- extend：扩展基础对象的上下文，提供各种工具类、属性。
- middleware：增加一个或多个中间件，提供请求的前置、后置处理逻辑。
- config：配置各个环境下插件自身的默认配置项。

一个独立领域下的插件实现，可以在代码维护性非常高的情况下实现非常完善的功能，而插件也支持配置各个环境下的默认（最佳）配置，让我们使用插件的时候几乎可以不需要修改配置项。

[egg-security](https://github.com/eggjs/egg-security) 插件就是一个典型的例子。

更多关于插件的内容，请查看[插件](../advanced/plugin.md)章节。

### 升级计划

#### Egg 1.x

现在 Node.js 的 LTS 版本尚不支持 async function，所以 Egg 仍然基于 Koa 1.x 开发，但是在此基础上，Egg 全面增加了 async function 的支持，再加上 Egg 对 Koa 2.x 的中间件也完全兼容，应用层代码可以完全基于 [async function 来实现](../tutorials/async-function.md)。

- 底层基于 Koa 1.x，异步解决方案基于 [co] 封装的 generator function。
- 官方插件以及 Egg 核心使用 generator function 编写，保持对 Node.js LTS 版本的支持，在必要处通过 co 包装以兼容在 async function 中的使用。
- 应用开发者可以选择 async function（Node.js 7.6+） 或者 generator function（Node.js 6.0+）进行编写，**我们推荐 generator function 方案以确保应用可以运行在 Node.js LTS 版本上**。

#### Egg next

当 Node.js 的 LTS 版本开始支持 async function 时，Egg 核心将会迁移到 Koa 2.x，并保持对 generator function 的兼容。

- 底层基于 Koa 2.x，异步解决方案基于 async function。
- 官方插件以及 Egg 核心使用 async function 编写。
- 建议业务层迁移到 async function 方案。
- 不再支持 Node.js 6.x。

[co]: https://github.com/tj/co
[async function]: https://github.com/tc39/ecmascript-asyncawait
