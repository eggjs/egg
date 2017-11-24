title: Egg@2 升级指南
---

## 背景

随着 Node.js 8 LTS 的发布， 内建了对 ES2017 Async Function 的支持。

在这之前，TJ 的 [co] 使我们可以提前享受到 `async/await` 的编程体验，但同时它不可避免的也带来一些问题：

- 性能损失
- [错误堆栈不友好](https://github.com/eggjs/egg/wiki/co-vs-async)

现在 Egg 正式发布了 2.x 版本：
- 保持了对 Egg 1.x 以及 `generator function` 的**完全兼容**。
- 基于 Koa 2.x，异步解决方案基于 `async function`。
- 只支持 Node.js 8 及以上版本。
- 去除 [co] 后堆栈信息更清晰，带来 30% 左右的性能提升（不含 Node 带来的性能提升），详细参见：[benchmark](https://eggjs.github.io/benchmark/plot/)。

Egg 的理念之一是`渐进式增强`，故我们为开发者提供`渐进升级`的体验。

- [快速升级](#快速升级)
- [进一步升级](#进一步升级)
- [针对`插件开发者`的升级指南](#插件升级)

## 快速升级

- Node.js 使用最新的 LTS 版本（`>=8.9.0`）。
- 执行 `egg-bin autod`，会自动升级 `egg` 的依赖为 `^2.0.0`，以及其他插件版本。
- 重新安装依赖，跑单元测试。

**搞定！不需要修改任何一行代码，就已经完成了升级。**

## 进一步升级

得益于 Egg 对 1.x 的**完全兼容**，我们可以如何非常快速的完成升级。

不过，为了更好的统一代码风格，以及更佳的性能和错误堆栈，我们建议开发者进一步升级：

- 修改为推荐的代码风格，传送门：[代码风格指南](./style-guide.md)
- [中间件使用 Koa2 风格](#中间件使用-Koa2-风格)
- [函数调用的 `yieldable` 转为 `awaitable`](#yieldable-To-awaitable)

### 中间件使用 Koa2 风格

> 2.x 仍然保持对 1.x 风格的中间件的兼容，故不修改也能继续使用。

- 返回的函数入参改为 Koa 2 的 `(ctx, next)` 风格。
  - 第一个参数为 `ctx`，代表当前请求的上下文，是 [Context](../basics/extend.md#Context) 的实例。
  - 第二个参数为 `next`，用 await 执行它来执行后续中间件的逻辑。
- 不建议使用 `async (ctx, next) => {}` 格式，避免错误堆栈丢失函数名。
- `yield next` 改为函数调用 `await next()` 的方式。

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
    // 注意，和 generator function 格式的中间件不同，此时 next 是一个方法，必须要调用它
    await next();
    const delta = Math.ceil(Date.now() - start);
    ctx.set('X-Response-Time', delta + 'ms');
  };
};
```

### yieldable to awaitable

> 我们早在 Egg 1.x 时就已经支持 async，故若应用层已经是 async-base 的，就可以跳过本小节内容了。

[co] 支持了 `yieldable` 兼容类型：

- promises
- array (parallel execution)
- objects (parallel execution)
- thunks (functions)
- generators (delegation)
- generator functions (delegation)

尽管 `generator` 和 `async` 两者的编程模型基本一模一样，但由于上述的 `co` 的一些特殊处理，导致在移除 `co` 后，我们需要根据不同场景自行处理：

#### promise

直接替换即可：

```js
function echo(msg) {
  return Promise.resolve(msg);
}

yield echo('hi egg');
// change to
await echo('hi egg');
```

#### array - yield []

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

#### object - yield {}

`yield {}` 和 `yield map` 的方式也常用于并发请求，但由于 `Promise.all` 不支持 Object，会稍微有点复杂。

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

建议修改为 `await Promise.all([])` 的方式：

```js
// app/service/biz.js
class BizService extends Service {
  list(topic, uid) {
    return Promise.all([
      ctx.service.news.list(topic),
      ctx.service.user.get(uid),
    ]);
  }
}

// app/controller/home.js
const [ news, user ] = await ctx.service.biz.list(topic, uid);
```

如果无法修改对应的接口，可以临时兼容下：

- 使用我们提供的 Utils 方法 [app.toPromise]。
- **建议尽量改掉，因为实际上就是丢给 co，会带回对应的性能损失和堆栈问题。**

```js
const { news, user } = await app.toPromise(ctx.service.biz.list(topic, uid));
```

#### 其他

- thunks (functions)
- generators (delegation)
- generator functions (delegation)

修改为对应的 async function 即可，如果不能修改，则可以用 [app.toAsyncFunction] 简单包装下。

**注意**
- [toAsyncFunction][app.toAsyncFunction] 和 [toPromise][app.toPromise] 实际使用的是 [co] 包装，因此会带回对应的性能损失和堆栈问题，建议开发者还是尽量全链路升级。
- [toAsyncFunction][app.toAsyncFunction] 在调用 async function 时不会有损失。

@sindresorhus 编写了许多[基于 promise 的 helper 方法](https://github.com/sindresorhus/promise-fun)，灵活的运用它们配合 async function 能让代码更加具有可读性。

## 插件升级

`应用开发者`只需升级`插件开发者`修改后的依赖版本即可，可以用我们提供的命令 `egg-bin autod` 快速更新。

以下内容针对`插件开发者`，指导如何升级插件：

### 升级事项

- 完成上面章节提到的升级项。
  - 所有的 `generator function` 改为 `async function` 格式。
  - 升级中间件风格。
- 接口兼容（可选），如下。
- 发布大版本。

### 接口兼容

某些场景下，`插件开发者`提供给`应用开发者`的接口是同时支持 generator 和 async 的，一般是会用 co 包装一层。

- 在 2.x 里为了更好的性能和错误堆栈，我们建议修改为 `async-first`。
- 如有需要，使用 [toAsyncFunction][app.toAsyncFunction] 和 [toPromise][app.toPromise] 来兼容。

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

`插件开发者`可以简单包装下原始函数：

```js
// https://github.com/eggjs/egg-schedule/blob/80252ef/lib/load_schedule.js#L38
task = app.toAsyncFunction(schedule.task);
```

### 插件发布规则

- **需要发布大版本**
  - 除非插件提供的接口都是 promise 的，且代码里面不存在 `async`，如 [egg-view-nunjucks]。
- 修改 `package.json`
  - 修改 `devDependencies` 依赖的 `egg` 为 `^2.0.0`。
  - 修改 `engines.node` 为 `>=8.0.0`。
  - 修改 `ci.version` 为 `8, 9`， 并重新安装依赖以便生成新的 travis 配置文件。
- 修改 `README.md` 的示例为 async function。
- 修改 `test/fixtures` 为 async function，可选，建议分开另一个 PR 方便 Review。


[co]: https://github.com/tj/co
[egg-schedule]: https://github.com/eggjs/egg-schedule
[egg-view]: https://github.com/eggjs/egg-view
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[app.toAsyncFunction]: https://github.com/eggjs/egg-core/blob/da4ba1784175c43217125f3d5cd7f0be3d5396bf/lib/egg.js#L344
[app.toPromise]: https://github.com/eggjs/egg-core/blob/da4ba1784175c43217125f3d5cd7f0be3d5396bf/lib/egg.js#L353