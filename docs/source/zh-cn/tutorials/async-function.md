title: 使用 async function 开发应用
---

[前面的章节](../intro/egg-and-koa.md#async-function)中介绍了 [async function] 是 js 语言层面提供的异步解决方案，而 Node.js 从 7.6.0 开始将会升级 v8 到 5.5，届时 async function 将不再需要开启 flag 即可使用。框架也默认支持了 async function，在所有支持 generator function 的地方都可以使用 async function 替代。

**注意：在基于 async function 编写应用代码时，请确保你的代码运行在 Node.js 7.6+ 的版本上。**

## controller & service

在 [controller] 章节中，我们提供了 controller 的两种写法：基于类和普通方法，其中所有用 generator function 实现的地方都可以用 aync function 来实现，代码逻辑没有任何变化，仅需要将 yield 语法改成 await 语法。
而 [service] 和 [controller] 一样，所有的异步方法都可以用 async function 替换文档中的 async function。

举个例子，将 [controller] 文档中的示例改造成 async function 模式：

```js
// app/controller/post.js
module.exports = app => {
  class PostController extends app.Controller {
    // 从 * create() 换成 async create()
    async create() {
      const { ctx, service } = this;
      const createRule = {
        title: { type: 'string' },
        content: { type: 'string' },
      };
      // 校验参数
      ctx.validate(createRule);
      // 组装参数
      const author = ctx.session.userId;
      const req = Object.assign(ctx.request.body, { author });
      // 调用 service 进行业务处理
      // 从 yield 换成 await
      const res = await service.post.create(req);
      // 设置响应内容和响应状态码
      ctx.body = { id: res.id };
      ctx.status = 201;
    }
  }

  return PostController;
}
```

**注意：在上面的 contorller 中，我们用 await 调用了 `service.post.create()` 方法，如果这个方法是 generaotr function 类型，则也需要改造成 async function 接口才可以被调用。**

## 定时任务

框架提供的[定时任务]也支持 async function，只需要将 task 按照上面的规则，从 generator function 替换成 async function 即可。

```js
module.exports = {
  // 通过 schedule 属性来设置定时任务的执行间隔等配置
  schedule: {
    interval: '1m', // 1 分钟间隔
    type: 'all', // 指定所有的 worker 都需要执行
  },
  // task 是真正定时任务执行时被运行的函数，第一个参数是一个匿名的 Context 实例
  async task(ctx) {
    const res = await ctx.curl('http://www.api.com/cache', {
      dataType: 'json',
    });
    ctx.app.cache = res.data;
  },
};
```

## 中间件

框架中所有的中间件，包括[标准定义方式](../basics/middleware.md)以及在[路由中定义的中间件](../basics/router.md#中间件的使用)都可以通过 async function 来编写。但是和 generator function 格式的中间件稍有不同的是，中间件的参数列表变化了，和 Koa v2.x 一样：

- 第一个参数为 `ctx`，代表当前请求的上下文，是 [Context](../basics/extend.md#Context) 的实例。
- 第二个参数为 `next`，用 await 执行它来执行后续中间件的逻辑。

```js
// app/middleware/gzip.js

const isJSON = require('koa-is-json');
const zlib = require('zlib');

module.exports = (options, app) => {
  return async function gzip(ctx, next) {
    // 注意，和 generator function 格式的中间件不同，此时 next 是一个方法，必须要调用它
    await next();

    // 后续中间件执行完成后将响应体转换成 gzip
    const body = ctx.body;
    if（!body) return;

    // 支持 options.threshold
    if (options.threshold && ctx.length < options.threshold) return;

    if (isJSON(body)) body = JSON.stringify(body);

    // 设置 gzip body，修正响应头
    ctx.body = zlib.createGzip().end(body);
    ctx.set('Content-Encoding', 'gzip');
  };
};
```

## 调用 generator function API

由于一些已有的插件直接提供的是 generator function 的 API，无法直接在 async function 中通过 await 调用，我们可以通过 [co] 提供的 wrap 方法将它们包装成一个返回 Promise 的接口即可在 async function 中使用。

```js
const co = require('co');
app.mysql.query = co.wrap(app.mysql.query);
// 如果想要直接用 query 方法，需要绑定 this 为 app.mysql
const query = co.wrap(app.mysql.query).bind(app.mysql);

// 包装之后即可在 async function 中使用
async function getUser() {
  // return await app.mysql.query();
  return await query();
}
```

## 和 generator function 的细微差别

尽管两者的编程模型基本一模一样，但是 [co] 做了一些特殊处理，例如支持 yield 一个数组（对象），这些在 async function 中都无法原生做到，但是基于一些 Prmoise 提供的方法以及工具库，也可以轻松的实现这些功能。

- generator function

  ```js
  function* () {
    const tasks = [ task(1), task(2), task(3) ];
    let results;
    // 并行
    results = yield tasks;
    // 控制最大并发数为 2
    result = yield require('co-parallel')(tasks, 2);
  }
  ```

- async function

  ```js
  async () => {
    const tasks = [ task(1), task(2), task(3) ];
    let results;
    // 并行
    results = await Promise.all(tasks);
    // 控制最大并发数为 2
    results = await require('p-all')(tasks, { concurrency: 2} );
  }
  ```

@sindresorhus 编写了许多[基于 promise 的 helper 方法](https://github.com/sindresorhus/promise-fun)，灵活的运用它们配合 async function 能让代码更加具有可读性。

----

一个完整的例子可以参考 [examples/hackernews-async](https://github.com/eggjs/examples/tree/master/hackernews-async)。

[async function]: https://github.com/tc39/ecmascript-asyncawait
[co]: https://github.com/tj/co
[controller]: ../basics/controller.md
[service]: ../basics/service.md
[定时任务]: ../basics/schedule.md
