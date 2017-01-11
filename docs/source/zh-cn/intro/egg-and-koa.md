title: egg 与 koa
---

## 异步编程模型

node 是一个异步的世界，官方 API 支持的都是 callback 形式的异步编程模型，这会带来许多问题，例如

- [callback hell](http://callbackhell.com/): 最臭名昭著的 callback 嵌套问题。
- [release zalgo](https://oren.github.io/blog/zalgo.html): 异步函数中可能同步调用 callback 返回数据，带来不一致性。

因此社区提供了各种异步的解决方案，最终胜出的是 Promise，它也内置到了 ECMAScript 2015 中。而在 Promise 的基础上，结合 Generator 提供的切换上下文能力，出现了 [co](https://github.com/tj/co) 等第三方类库来让我们用同步写法编写异步代码。同时，[async await](https://github.com/tc39/ecmascript-asyncawait) 这个官方解决方案也已经定稿，将于 ECMAScript 2017 中发布。

### Generator 和 co

#### 基于 Generator 和 Promise 提供同步写法的异步模型

上面提到，基于 Promise 和 Generator 可以实现用同步的方式编写异步代码，实现这个功能最广为人知的库就是 [co](https://github.com/tj/co)，其实它的核心原理就是下面这几行。

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

[co](https://github.com/tj/co) 相比于上面提到的那个 run 函数而言，加了支持 `yield [Object / Array / thunk / Generator Function / Generator]`，wrap 一个 Generator Function 成 Promise 等功能。而 co 也是 koa 1 选择的底层异步库，所有的 koa 1 的中间件都必须是一个 `generator function`。

### async await

async await 的原理其实和 co 类似，但它是语言层面提供的语法糖，通过 async await 编写的代码和 co + generator 编写的代码看起来很类似。

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

相较于 co 支持的种类，async await 不能直接 await 一个 `Promise` 数组（可以通过 `Promise.all` 来封装），也不能 await `thunk`。

由于 async await 还尚未随着规范发布，node 7 中带的 V8 版本已经支持（但是[仍然有问题](https://github.com/nodejs/node/issues/9339)），async await 还不能直接使用，必须经过 babel 等模块进行编译。同时 koa 2 开始支持 `async function` 类型的中间件。

## koa

> Koa is a new web framework designed by the team behind Express, which aims to be a smaller, more expressive, and more robust foundation for web applications and APIs.

koa 和 express 的设计风格非常类似，底层也都是共用的[同一套 http 基础库](https://github.com/jshttp)，但是有几个显著的区别，除了上面提到的默认异步解决方案之外，主要的特点还有下面几个。

### Midlleware

koa 的中间件和 express 不同，koa 选择了洋葱圈模型。

- 中间件洋葱图：

![](https://camo.githubusercontent.com/d80cf3b511ef4898bcde9a464de491fa15a50d06/68747470733a2f2f7261772e6769746875622e636f6d2f66656e676d6b322f6b6f612d67756964652f6d61737465722f6f6e696f6e2e706e67)

- 中间件执行顺序图：

![](https://raw.githubusercontent.com/koajs/koa/a7b6ed0529a58112bac4171e4729b8760a34ab8b/docs/middleware.gif)

所有的请求经过一个中间件的时候都会执行两次，对比 express 形式的中间件，koa 的模型可以非常方便的实现后置处理逻辑，对比 koa 和 express 的 compress 中间件就可以明显的感受到 koa 中间件模型的优势。

- [koa-compress](https://github.com/koajs/compress/blob/master/index.js) for koa.
- [compression](https://github.com/expressjs/compression/blob/master/index.js) for express.

### Context

和 express 只有 Request 和 Response 两个对象不同，koa 增加了一个 Context 的对象，作为这次请求的上下文对象（在 koa 1 中为中间件的 `this`，在 koa 2 中作为中间件的第一个参数传入）。我们可以将一次请求相关的上下文都挂载到这个对象上。类似 [traceId](https://github.com/eggjs/egg-tracer/blob/1.0.0/lib/tracer.js#L12) 这种需要贯穿整个请求（在后续任何第一个地方进行其他调用都需要用到）的属性就可以挂载上去。相较于 request 和 response 而言更加符合语义。

同时 Context 上也挂载了 Request 和 Response 两个对象。和 express 类似，这两个对象都提供了大量的便捷方法辅助开发，例如

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

## egg 是 koa

egg 选择了 koa 作为其基础框架，而在 koa 的模型基础上，我们又进一步对它进行了一些增强。

### 扩展

在基于 egg 的框架或者应用中，我们可以通过定义 `app/extend/{application,context,request,response}.js` 来扩展 koa 中对应的四个对象的原型，通过这个功能，我们可以快速的增加更多的辅助方法，例如我们在 `app/extend/context.js` 中写入下列代码：

```js
module.exports = {
  get isIOS() {
    const iosReg = /iphone|ipad|ipod/i;
    return iosReg.test(this.get('user-agent');
  },
};
```

在 controller 中，我们就可以使用到刚才定义的这个便捷属性了：

```js
exports.handler = function*() {
  this.body = this.isIOS
    ? 'Your operating system is iOS.'
    : 'Your operating system is not iOS.';
};
```

更多关于扩展的内容，请查看[框架扩展](../basics/extend.md)章节。

### 插件

众所周知，在 express 和 koa 中，经常会引入许许多多的中间件来提供各种各样的功能，例如引入 [koa-session](https://github.com/koajs/session) 提供 session 的支持，引入 [koa-bodyparser](https://github.com/koajs/bodyparser) 来解析请求 body。而 egg 提供了一个更加强大的插件机制，让这些独立领域的功能模块可以更加容易编写。

一个插件可以包含

- extend：扩展基础对象的上下文，提供各种工具类、属性。
- middleware：增加一个或多个中间件，提供请求的前置、后置处理逻辑。
- config：配置各个环境下插件自身的默认配置项。

一个独立领域下的插件实现，可以在代码维护性非常高的情况下实现非常完善的功能，而插件也支持配置各个环境下的默认（最佳）配置，让我们使用插件的时候几乎可以不需要修改配置项。

[egg-security](https://github.com/eggjs/egg-security) 插件就是一个典型的例子。

更多关于插件的内容，请查看[插件](../advanced/plugin.md)章节。

### 升级计划

尽管现在 koa 2 已经比较稳定了，但是 koa 2 需要配合 async await 使用才有意义，所以仍然需要 babel 等工具进行编译。所以 egg 1 是基于 koa 1 开发的，主要考虑到

1. 服务端代码需要足够的稳定，并且出现故障时可以最快的定位到问题，所以尽量不要让编译后的后端代码运行在生产环境。
1. node 6 对 ECMAScript 2015 的支持已经达到了 [99%](http://node.green/)，绝大多数的语法已经不需要 babel 也能够使用了。
1. 基于 co + generator 的开发体验和 async await 没有区别，而且本质上它们就是同一个东西。当真的要做代码迁移的时候基本通过简单的替换就能完成。

当然，当 node 8 发布，async await 在 LTS 版本上处于默认可用状态的时候，koa 2 会发布正式版，egg 也会在那个时候升级到 koa 2。
