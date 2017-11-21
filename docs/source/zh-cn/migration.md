title: Egg@2 升级指南
---

随着 Node.js 8 LTS 的发布， 内建了对 ES2017 Async Function 的支持。

因此，Egg 也正式发布 2.x 版：
- 保持了对 Egg 1.x 以及 `generator function` 的**完全兼容**。
- 基于 Koa 2.x，异步解决方案基于 `async function`。
- 只支持 Node.js 8 及以上版本。
- 去除 [co] 后堆栈信息更清晰，带来 30% 左右的性能提升。（[benchmark](https://eggjs.github.io/benchmark/plot/)）

即：应用层只需要升级到 Node.js 8，然后重新安装 Egg 的依赖为 `^2.0.0`， 无需修改任何一行代码，就已经完成了升级。

不过，为了更好的统一代码风格，以及更佳的性能和错误堆栈，我们建议开发者进一步升级：

- 使用推荐的代码风格。
- 中间件使用 Koa2 风格。
- 函数调用的 `yieldable` 转为 `awaitable`。
- 插件升级为 `async-first`。


## 代码风格优化

> 建议开发者使用 `egg-init --type=simple showcase` 来生成并观察最新推荐的项目结构和配置。

对于应用开发者，我们现在推荐使用以下方式，以便获得更好的代码提示：

```js
// old style
module.exports = app => {
  class UserService extends app.Service {
    async list() {
      return await this.ctx.curl('https://eggjs.org');
    }
  }
  return UserService;
};
```

修改为：

```js
const Service = require('egg').Service;
class UserService extends Service {
  async list() {
    return await this.ctx.curl('https://eggjs.org');
  }
}
module.exports = UserService;
```

同时，框架开发者需要改变写法如下，否则用户自定义 Service 等基类会有问题：

```js
const egg = require('egg');

module.export = Object.assign(egg, {
  Application: class MyApplication extends egg.Application {
    // ...
  },
  // ...
});
```

## 中间件使用 Koa2 风格

> 2.x 仍然保持对 1.x 风格的中间件的兼容，故不修改也能继续使用。

- 返回的函数入参改为 `(ctx, next)`
- `yield next` 改为函数调用 `await next()`

```js
// 1.x
module.exports = () => {
  return function* responseTime(next) {
    const start = Date.now();
    yield next;
    const delta = Math.ceil(Date.now() - start);
    this.set('X-Response-Time', delta + 'ms');
  };
};

// 2.x
module.exports = () => {
  return async function responseTime(ctx, next) {
    const start = Date.now();
    await next();
    const delta = Math.ceil(Date.now() - start);
    ctx.set('X-Response-Time', delta + 'ms');
  };
};
```

## yieldable -> awaitable

[co] 支持了 `yieldable` 兼容类型：

- promises
- array (parallel execution)
- objects (parallel execution)
- thunks (functions)
- generators (delegation)
- generator functions (delegation)

因此 `generator` 改为 `async` 不能只是简单的替换，我们一起来看看各自场景：

### promise

直接替换即可：

```js
function echo(msg) {
  return Promise.resolve(msg);
}

yield echo('hi egg');
// change to
await echo('hi egg');
```

### array - yield []

`yield []` 常用于并发请求，如：

```js
const [ news, user ] = yield [
  ctx.service.news.list(topic),
  ctx.service.user.get(uid),
];
```

这种修改起来比较简单，用 `Promise.all()` 包装下即可：

```js
const [ news, user ] = await Promise.all([
  ctx.service.news.list(topic),
  ctx.service.user.get(uid),
]);
```

### object - yield {}

```js
// app/service/biz.js
class BizService extends Service {
  * list(topic, uid) {
    return {
      news: ctx.service.news.list(topic),
      user: ctx.service.user.get(uid),
    };
  }
}

// app/controller/home.js
const { news, user } = yield ctx.service.biz.list(topic, uid);
```

这种方式，由于 `Promise.all` 不支持 Object，会稍微有点复杂。

长远来讲，建议是修改为 Array 的方式。

临时兼容方式是：
- 我们提供的 `app.toPromise` 包装一下。
- Bluebird 提供的 [Promise.props](http://bluebirdjs.com/docs/api/promise.props.html)
- **建议尽量改掉，因为包装会影响到堆栈和性能损失。**

```js
const { news, user } = await app.toPromise(ctx.service.biz.list(topic, uid));
```

### 其他

- thunks (functions)
- generators (delegation)
- generator functions (delegation)

修改为对应的 async function 即可，如果不能修改，则可以用 [app.toAsyncFunction] 简单包装下。


### 注意事项
- [app.toAsyncFunction] 和 [app.toPromise] 实际使用的是 [co] 包装，因此会引入 [co] 本身的性能损耗和堆栈问题，建议开发者还是尽量全链路升级。
- [app.toAsyncFunction] 在调用 async function 时不会有损失。

## 插件升级

`应用开发者`只需升级`插件开发者`修改后的依赖版本即可，可以用我们提供的命令 `egg-bin autod` 快速更新。

以下内容针对`插件开发者`，指导如何升级插件：

### 升级事项

- 所有的 `generator function` 改为 `async function` 格式。
- 中间件按上文的方式升级。
- 接口兼容，可选，如下。
- 发布大版本。

### 接口兼容

某些场景下，`插件开发者`提供给`应用开发者`的接口是同时支持 generator 和 async 的，一般是会用 co 包装一层。

- 在 2.x 里为了更好的性能和错误堆栈，我们建议修改为 `async-first`。
- 我们也提供了以下 utils 来方便插件开发者兼容：
  - [app.toAsyncFunction]
  - [app.toPromise]

譬如 [egg-schedule] 插件，支持应用层使用 generator 或 async 定义 task。

```js
// {app_root}/app/schedule/cleandb.js
exports.task = function* (ctx) {
  yield ctx.service.db.clean();
};

// {app_root}/app/schedule/log.js
exports.task = async function splitLog(ctx) {
  await ctx.service.log.split();
};
```

因此`插件开发者`可以简单包装下原始函数：

```js
// https://github.com/eggjs/egg-schedule/blob/80252ef/lib/load_schedule.js#L38
task = app.toAsyncFunction(schedule.task);
```

### 插件发布规则

- **需要发布大版本**
  - 除非插件提供的接口都是 promise 的，且代码里面不存在 `async`，如 [egg-view-nunjucks] 。
- 修改 `package.json`
  - 修改 `devDependencies` 依赖的 `egg` 为 `^2.0.0`。
  - 修改 `engines.node` 为 `>=8.0.0`。
  - 修改 `ci.version` 为 `8, 9`， 并重新安装依赖以便生成新的 travis 配置文件。
- 修改 `README.md` 的示例为 async function。
- [可选] 修改 `test/fixtures` 为 async function，建议分开另一个 PR 方便 Review。


[co]: https://github.com/tj/co
[egg-schedule]: https://github.com/eggjs/egg-schedule
[egg-view]: https://github.com/eggjs/egg-view
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[app.toAsyncFunction]: https://github.com/eggjs/egg-core/blob/da4ba1784175c43217125f3d5cd7f0be3d5396bf/lib/egg.js#L344
[app.toPromise]: https://github.com/eggjs/egg-core/blob/da4ba1784175c43217125f3d5cd7f0be3d5396bf/lib/egg.js#L353