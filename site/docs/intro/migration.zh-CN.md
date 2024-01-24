---
title: Egg@2 升级指南
order: 4
---

## 背景

随着 Node.js 8 LTS 的发布，内建了对 ES2017 Async Function 的支持。

在这之前，TJ 的 [co] 使我们可以提前享受到 `async/await` 的编程体验，但同时它不可避免地也带来了一些问题：

- 性能损失
- [错误堆栈不友好](https://github.com/eggjs/egg/wiki/co-vs-async)

现在，Egg 正式发布了 2.x 版本：

- 保持了对 Egg 1.x 以及 `generator function` 的**完全兼容**。
- 基于 Koa 2.x，异步解决方案基于 `async function`。
- 只支持 Node.js 8 及以上版本。
- 去除 [co] 后堆栈信息更清晰，带来 30% 左右的性能提升（不含 Node 带来的性能提升），详细参见：[benchmark](https://eggjs.github.io/benchmark/plot/)。

Egg 的理念之一是“渐进式增强”，故我们为开发者提供“渐进升级”的体验。

- [快速升级](#快速升级)
- [插件变更说明](#插件变更说明)
- [进一步升级](#进一步升级)
- [针对“插件开发者”的升级指南](#插件升级)

## 快速升级

- Node.js 使用最新的 LTS 版本（`>= 8.9.0`）。
- 修改 `package.json` 中 `egg` 的依赖为 `^2.0.0`。
- 检查相关插件是否发布新版本（可选）。
- 重新安装依赖，跑单元测试。

**搞定！几乎不需要修改任何一行代码，就已经完成了升级。**

## 插件变更说明

### egg-multipart

`yield parts` 需修改为 `await parts()` 或 `yield parts()`。

```js
// 旧代码
const parts = ctx.multipart();
let part;
while ((part = yield parts) != null) {
  // do something
}

// yield parts() 也可以工作
while ((part = yield parts()) != null) {
  // do something
}

// 新代码
const parts = ctx.multipart();
while ((part = await parts()) != null) {
  // do something
}
```

- [egg-multipart#upload-multiple-files](https://github.com/eggjs/egg-multipart#upload-multiple-files)

### egg-userrole

不再兼容 1.x 形式的 role 定义，因为 koa-roles 已经无法兼容了。请求上下文 `Context` 从 `this` 传入改成了第一个参数 `ctx` 传入，原有的 `scope` 变成了第二个参数。

```js
// 旧代码
app.role.use('user', function () {
  return !!this.user;
});

// 新代码
app.role.use((ctx, scope) => {
  return !!ctx.user;
});

app.role.use('user', (ctx) => {
  return !!ctx.user;
});
```

- [koajs/koa-roles#13](https://github.com/koajs/koa-roles/pull/13)
- [eggjs/egg-userrole#9](https://github.com/eggjs/egg-userrole/pull/9)

## 进一步升级

得益于 Egg 对 1.x 的**完全兼容**，我们可以非常快速地完成升级。

不过，为了更好地统一代码风格，以及更佳的性能和错误堆栈，我们建议开发者进一步升级：

- 修改为推荐的代码风格，传送门：[代码风格指南](../community/style-guide.md)
- [中间件使用 Koa2 风格](#中间件使用-Koa2-风格)
- [将 `yieldable` 函数调用转为 `awaitable`](#yieldable-to-awaitable)

### 中间件使用 Koa2 风格

> 2.x 仍然保持对 1.x 风格的中间件的兼容，故不修改也能继续使用。

- 返回的函数入参改为 Koa 2 的 `(ctx, next)` 风格。
  - 第一个参数为 `ctx`，代表当前请求的上下文，是 [Context](../basics/extend.md#Context) 的实例。
  - 第二个参数为 `next`，用 `await` 执行它来进行后续中间件的处理。
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
    // 注意，与 generator function 格式的中间件不同，next 是一个方法，必须调用它
    await next();
    const delta = Math.ceil(Date.now() - start);
    ctx.set('X-Response-Time', delta + 'ms');
  };
};
```
### yieldable 到 awaitable 的转换

> 我们在 Egg 1.x 版本时就已经支持了 async，所以如果应用层已经是基于 async 的话，可以跳过这个小节。

[co] 支持了 `yieldable` 兼容类型：

- promises
- array（并行执行）
- objects（并行执行）
- thunks（函数）
- generators（委托）
- generator 函数（委托）

尽管 `generator` 和 `async` 在编程模型上基本相同，但由于 `co` 的一些特殊处理，在移除 `co` 后，需要根据不同场景进行手动处理：

#### promise

直接替换即可：

```js
function echo(msg) {
  return Promise.resolve(msg);
}

yield echo('hi egg');
// 替换为
await echo('hi egg');
```

#### 数组 - yield []

`yield []` 常用于并发请求，比如：

```js
const [ news, user ] = yield [
  ctx.service.news.list(topic),
  ctx.service.user.get(uid),
];
```

这种修改比较简单，使用 `Promise.all()` 包装即可：

```js
const [news, user] = await Promise.all([
  ctx.service.news.list(topic),
  ctx.service.user.get(uid),
]);
```

#### 对象 - yield {}

`yield {}` 和 `yield map` 方式也常用于并发请求，由于 `Promise.all` 不支持对象，转换会稍微复杂一些。

```js
// app/service/biz.js
class BizService extends Service {
  * list(topic, uid) {
    return {
      news: yield ctx.service.news.list(topic),
      user: yield ctx.service.user.get(uid),
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
  async list(topic, uid) {
    const results = await Promise.all([
      ctx.service.news.list(topic),
      ctx.service.user.get(uid),
    ]);
    return {
      news: results[0],
      user: results[1],
    };
  }
}

// app/controller/home.js
const {news, user} = await ctx.service.biz.list(topic, uid);
```

如果无法修改相关接口，可以暂时使用我们提供的工具方法 [app.toPromise] 兼容一下。

**建议尽量修改，因为实际上就是交给了 co 处理，可能会引起性能损失和堆栈问题。**

```js
const { news, user } = await app.toPromise(ctx.service.biz.list(topic, uid));
```

#### 其他情况

- thunks（函数）
- generators（委托）
- generator 函数（委托）

只需改写为相应的 async 函数即可。如果无法修改，可以使用 [app.toAsyncFunction] 方法简单包装一下。

**注意**

- 使用 [toAsyncFunction][app.toasyncfunction] 和 [toPromise][app.topromise] 实际上是借助 [co] 进行包装的，因此可能导致性能损失和堆栈问题。我们建议开发者尽可能进行全链路升级。
- 在调用 async 函数时，[toAsyncFunction][app.toasyncfunction] 不会引起额外损失。

@sindresorhus 编写了不少[基于 promise 的辅助方法](https://github.com/sindresorhus/promise-fun)，灵活利用这些方法配合 async 函数可以让代码更加清晰易读。
## 插件升级

`应用开发者` 只需升级 `插件开发者` 修改后的依赖版本即可，也可以用我们提供的命令 `egg-bin autod` 快速更新。

以下内容针对 `插件开发者`，指导如何升级插件：

### 升级事项

- 完成上面章节提到的升级项。
  - 所有的 `generator function` 改为 `async function` 格式。
  - 升级中间件风格。
- 接口兼容（可选），如下所示。
- 发布大版本。

### 接口兼容

某些场景下，`插件开发者` 提供给 `应用开发者` 的接口同时支持 generator 和 async，一般会用 `co` 包装一层。

- 在 2.x 里，为了更好的性能和错误堆栈，我们建议修改为 `async-first`。
- 如有需要，可以使用 [`toAsyncFunction`](https://github.com/eggjs/egg-core/blob/da4ba1784175c43217125f3d5cd7f0be3d5396bf/lib/egg.js#L344) 和 [`toPromise`](https://github.com/eggjs/egg-core/blob/da4ba1784175c43217125f3d5cd7f0be3d5396bf/lib/egg.js#L353) 来实现兼容。

例如，[`egg-schedule`](https://github.com/eggjs/egg-schedule) 插件支持应用层使用 generator 或 async 定义任务：

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

`插件开发者` 可以简单包装下原始函数：

```js
// https://github.com/eggjs/egg-schedule/blob/80252ef/lib/load_schedule.js#L38
task = app.toAsyncFunction(schedule.task);
```

### 插件发布规则

- **需要发布大版本**
  - 除非插件提供的接口都是 promise 的，且代码里不存在 `async`，如 [`egg-view-nunjucks`](https://github.com/eggjs/egg-view-nunjucks)。
- 修改 `package.json`
  - 修改 `devDependencies` 依赖的 `egg` 为 `^2.0.0`。
  - 修改 `engines.node` 为 `>=8.0.0`。
  - 修改 `ci.version` 为 `8, 9` 并重新安装依赖，以生成新的 travis 配置文件。
- 修改 `README.md` 中的示例为 `async function`。
- 编写升级指引。
- 修改 `test/fixtures` 为 `async function`，可选，建议分开另一个 PR 以方便 Review。

一般还需要继续维护上一个版本，故需：

- 为上一个版本建立一个 `1.x` 分支。
- 修改上一个版本的 `package.json` 中的 `publishConfig.tag` 为 `1.x`。
- 这样，当上一个版本有 BugFix 时，在 npm 版本中会发布为 `release-1.x` 这个 tag，用户通过 `npm i egg-xx@release-1.x` 来引入旧版本。
- 参见 [npm 文档](https://docs.npmjs.com/cli/dist-tag)。


[co]: https://github.com/tj/co
[egg-schedule]: https://github.com/eggjs/egg-schedule
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[app.toasyncfunction]: https://github.com/eggjs/egg-core/blob/da4ba1784175c43217125f3d5cd7f0be3d5396bf/lib/egg.js#L344
[app.topromise]: https://github.com/eggjs/egg-core/blob/da4ba1784175c43217125f3d5cd7f0be3d5396bf/lib/egg.js#L353
