---
title: Egg@2 Upgrade guideline
order: 4
---

## Background

With the official release of Node.js 8 LTS, egg now comes with built-in ES2017 Async Function support.

Though the TJ [co] has brought `async/await` programming experience before this, but it also has some inevitable problems:

- performance lost
- [obscure error logs](https://github.com/eggjs/egg/wiki/co-vs-async)

In the official Egg 2.x:

- Full compatibility to Egg 1.x and `generator function`.
- Koa 2.x based `async function` solutions.
- Only support Node.js 8 and above.
- Better error stack messages without [co], approximately 30% performance improvement (do not include the performance improvement brought by Node), see [benchmark](https://eggjs.github.io/benchmark/plot/) for more details.

One of the Egg's concept is `progressive`, hence we provide progressive programming experiences to developers.

- [Quick upgrade](#quick_upgrade)
- [Plugin update](#plugin)
- [Further upgrade](#forther_upgrade)
- [Upgrade documents for Plugin developers](#upgrade_documents_for_plugin_developers)

## Quick upgrade

- Use the latest Node LTS version (`>=8.9.0`).
- Change `egg` version to `^2.0.0` in `package.json`.
- Check if included plugins are the latest version (optional).
- Reinstall the dependencies, and run unit tests again.

**Done! Barely with any code changes**

## Plugin update

### egg-multipart

`yield parts` needs to change to `await parts()` or `yield parts()`

```js
// old
const parts = ctx.multipart();
while ((part = yield parts) != null) {
  // do something
}

// yield parts() also work
while ((part = yield parts()) != null) {
  // do something
}

// new
const parts = ctx.multipart();
while ((part = await parts()) != null) {
  // do something
}
```

- [egg-multipart#upload-multiple-files](https://github.com/eggjs/egg-multipart#upload-multiple-files)

### egg-userrole

DO NOT support 1.x role definition, because koa-roles is no longer compatible.
The `Context` has changed from `this` to the first argument `ctx`, the original `scope` now is the second argument.

```js
// old
app.role.use('user', function () {
  return !!this.user;
});

// new
app.role.use((ctx, scope) => {
  return !!ctx.user;
});

app.role.use('user', (ctx) => {
  return !!ctx.user;
});
```

- [koajs/koa-roles#13](https://github.com/koajs/koa-roles/pull/13)
- [eggjs/egg-userrole#9](https://github.com/eggjs/egg-userrole/pull/9)

## Further upgrade

Due to the complete compatibility to Egg 1.x, we can finish the upgrade quickly.

But in order to keep the coding style consistent, as well as a better performance improvement and more developer-friendly error stack logs, we suggest developers to make a further upgrade:

- Use recommended code style, see [Style guide](../community/style-guide.md)
- [Use Koa style middleware](#use-koa2-style-middleware)
- [Change `yieldable` to `awaitable` in function invoke](#yieldable-to-awaitable)

### Use Koa2-styled middleware

> 2.x is compatible to 1.x-styled middleware, so it's still functional without any changes.

- Use Koa 2's `(ctx, next)` arguments style in callback function
  - The 1st argument is `ctx`, means context, it is an instance of [Context](../basics/extend.md#Context)
  - The 2nd argument is `next`, use await to execute it for the coming logics.
- Using `async (ctx, next) => {}` is not recommended, which prevents anonymous function in error stack.
- Change `yield next` to `await next()`.

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
    // Note, differ from the generator function middleware, next is a function, we're executing it here
    await next();
    const delta = Math.ceil(Date.now() - start);
    ctx.set('X-Response-Time', delta + 'ms');
  };
};
```

### yieldable to awaitable

> async was supported in Egg 1.x, thus if the middleware is already async-base, we could skip this section.

[co] supports `yieldable` compatibility types:

- promises
- array (parallel execution)
- objects (parallel execution)
- thunks (functions)
- generators (delegation)
- generator functions (delegation)

Despite both `generator` and `async` have the same program models, but we may still need to refactor our codes correspondingly after removing `co` because of the above special handling from `co`.

#### promise

We can replace it directly:

```js
function echo(msg) {
  return Promise.resolve(msg);
}

yield echo('hi egg');
// change to
await echo('hi egg');
```

#### array - yield []

`yeild []` is normally used to send concurrent requests, such as:

```js
const [ news, user ] = yield [
  ctx.service.news.list(topic),
  ctx.service.user.get(uid),
];
```

In this case, use `Promise.all()` to wrap it:

```js
const [news, user] = await Promise.all([
  ctx.service.news.list(topic),
  ctx.service.user.get(uid),
]);
```

#### object - yield {}

Sometimes `yield {}` and `yield map` can also be used to send concurrent requests, but it may be a bit complex in this place because `Promise.all` doesn't support Object argument.

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

It's recommended to use `await Promise.all([])`:

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
const [news, user] = await ctx.service.biz.list(topic, uid);
```

If the interfaces are unchangeable, e can do things below as a workaround:

- Use [app.toPromise] method provided by our Utils.
- **This is built on top of the [co], so it may still cause performance issue and returning inaccurate error stacks, so this is not recommended.**

```js
const { news, user } = await app.toPromise(ctx.service.biz.list(topic, uid));
```

#### Others

- thunks (functions)
- generators (delegation)
- generator functions (delegation)

Use `async function` to replace the above functions, or use [app.toAsyncFunction] alternatively.

**Note**

- [toAsyncFunction][app.toasyncfunction] and [toPromise][app.topromise] are wrappers of [co], thus it may cause performance lost and error stack problems. So we're recommending developers to use all-chain upgrade.
- [toAsyncFunction][app.toasyncfunction] doesn't have performance lost when invokes async function.

@sindresorhus has written a lot [promise-based helpers](https://github.com/sindresorhus/promise-fun), use them together with async function could make source code more readable.

## Plugin update

`App developers` just need to update the upgraded plugins by `plugin developers`, or use `egg-bin autod` command we've prepared to quickly update.

The following content is for `plugin developers`, it shows how to update the plugins:

### Update precautions

- Finish the upgrade items above.
  - Replace all `generator function` with `async function`.
  - Upgrade middlewares.
- Interfaces compatibility (optional), see following.
- Release a major version.

### Interfaces compatibility

In some cases, the interface provided by `Plugin developers` supports both generator and async, normally it's wrapped by co.

- In 2.x, we suggest `async-first` to get a better performance and clearer error stacks.
- If necessary, please use [toAsyncFunction][app.toasyncfunction] and [toPromise][app.topromise] for compatibility.

Like [egg-schedule] plugin, it supports generator or async to define the tasks in application level.

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

`Plugin developers` could simply wrap the following raw function:

```js
// https://github.com/eggjs/egg-schedule/blob/80252ef/lib/load_schedule.js#L38
task = app.toAsyncFunction(schedule.task);
```

### Rules of Plugin release

- **Major version releasement**
  - All the APIs are promise based, and there's no `async` in source code. e.g. [egg-view-nunjucks]
- Modify `package.json`
  - Change `egg` in `devDependencies` to `^2.0.0`.
  - Change `engines.node` to `>=8.0.0`.
  - Change `ci.version` to `8, 9`, reinstall dependencies to generate new travis config files.
- Update examples in `README.md` with async function.
- Write instructions for upgrade.
- (optional) Change `test/fixtures` to async function, and it's recommended to create a PR for code preview.

In case the previous versions still requires maintenance:

- Create a new branch which based on previous `1.x` version.
- Change the `publishConfig.tag` property in `package.json` to `release-1.x` in previous version.
- If the previous version has new Bugfix, tag it as `release-1.x` when publishing, so users may use `npm i egg-xx@release-1` to import the old version.
- See [npm documentations](https://docs.npmjs.com/cli/dist-tag).

[co]: https://github.com/tj/co
[egg-schedule]: https://github.com/eggjs/egg-schedule
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[app.toasyncfunction]: https://github.com/eggjs/egg-core/blob/da4ba1784175c43217125f3d5cd7f0be3d5396bf/lib/egg.js#L344
[app.topromise]: https://github.com/eggjs/egg-core/blob/da4ba1784175c43217125f3d5cd7f0be3d5396bf/lib/egg.js#L353
