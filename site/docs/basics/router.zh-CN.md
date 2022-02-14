---
title: 路由（Router）
order: 6
---

Router 主要用来描述请求 URL 和具体承担执行动作的 Controller 的对应关系，
框架约定了 `app/router.js` 文件用于统一所有路由规则。

通过统一的配置，我们可以避免路由规则逻辑散落在多个地方，从而出现未知的冲突，集中在一起我们可以更方便的来查看全局的路由规则。

## 如何定义 Router

- `app/router.js` 里面定义 URL 路由规则

```js
// app/router.js
module.exports = (app) => {
  const { router, controller } = app;
  router.get('/user/:id', controller.user.info);
};
```

- `app/controller` 目录下面实现 Controller

```js
// app/controller/user.js
class UserController extends Controller {
  async info() {
    const { ctx } = this;
    ctx.body = {
      name: `hello ${ctx.params.id}`,
    };
  }
}
```

这样就完成了一个最简单的 Router 定义，当用户执行 `GET /user/123`，`user.js` 这个里面的 info 方法就会执行。

## Router 详细定义说明

下面是路由的完整定义，参数可以根据场景的不同，自由选择：

```js
router.verb('path-match', app.controller.action);
router.verb('router-name', 'path-match', app.controller.action);
router.verb('path-match', middleware1, ..., middlewareN, app.controller.action);
router.verb('router-name', 'path-match', middleware1, ..., middlewareN, app.controller.action);
```

路由完整定义主要包括 5 个主要部分:

- verb - 用户触发动作，支持 get，post 等所有 HTTP 方法，后面会通过示例详细说明。
  - router.head - HEAD
  - router.options - OPTIONS
  - router.get - GET
  - router.put - PUT
  - router.post - POST
  - router.patch - PATCH
  - router.delete - DELETE
  - router.del - 由于 delete 是一个保留字，所以提供了一个 delete 方法的别名。
  - router.redirect - 可以对 URL 进行重定向处理，比如我们最经常使用的可以把用户访问的根目录路由到某个主页。
- router-name 给路由设定一个别名，可以通过 Helper 提供的辅助函数 `pathFor` 和 `urlFor` 来生成 URL。(可选)
- path-match - 路由 URL 路径。
- middleware1 - 在 Router 里面可以配置多个 Middleware。(可选)
- controller - 指定路由映射到的具体的 controller 上，controller 可以有两种写法：
  - `app.controller.user.fetch` - 直接指定一个具体的 controller
  - `'user.fetch'` - 可以简写为字符串形式

### 注意事项

- 在 Router 定义中， 可以支持多个 Middleware 串联执行
- Controller 必须定义在 `app/controller` 目录中。
- 一个文件里面也可以包含多个 Controller 定义，在定义路由的时候，可以通过 `${fileName}.${functionName}` 的方式指定对应的 Controller。
- Controller 支持子目录，在定义路由的时候，可以通过 `${directoryName}.${fileName}.${functionName}` 的方式指定对应的 Controller。

下面是一些路由定义的方式：

```js
// app/router.js
module.exports = (app) => {
  const { router, controller } = app;
  router.get('/home', controller.home);
  router.get('/user/:id', controller.user.page);
  router.post('/admin', isAdmin, controller.admin);
  router.post('/user', isLoginUser, hasAdminPermission, controller.user.create);
  router.post('/api/v1/comments', controller.v1.comments.create); // app/controller/v1/comments.js
};
```

### RESTful 风格的 URL 定义

如果想通过 RESTful 的方式来定义路由，
我们提供了 `app.router.resources('routerName', 'pathMatch', controller)` 快速在一个路径上生成 [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) 路由结构。

```js
// app/router.js
module.exports = (app) => {
  const { router, controller } = app;
  router.resources('posts', '/api/posts', controller.posts);
  router.resources('users', '/api/v1/users', controller.v1.users); // app/controller/v1/users.js
};
```

上面代码就在 `/posts` 路径上部署了一组 CRUD 路径结构，对应的 Controller 为 `app/controller/posts.js` 接下来，
你只需要在 `posts.js` 里面实现对应的函数就可以了。

| Method | Path            | Route Name | Controller.Action             |
| ------ | --------------- | ---------- | ----------------------------- |
| GET    | /posts          | posts      | app.controllers.posts.index   |
| GET    | /posts/new      | new_post   | app.controllers.posts.new     |
| GET    | /posts/:id      | post       | app.controllers.posts.show    |
| GET    | /posts/:id/edit | edit_post  | app.controllers.posts.edit    |
| POST   | /posts          | posts      | app.controllers.posts.create  |
| PUT    | /posts/:id      | post       | app.controllers.posts.update  |
| DELETE | /posts/:id      | post       | app.controllers.posts.destroy |

```js
// app/controller/posts.js
exports.index = async () => {};

exports.new = async () => {};

exports.create = async () => {};

exports.show = async () => {};

exports.edit = async () => {};

exports.update = async () => {};

exports.destroy = async () => {};
```

如果我们不需要其中的某几个方法，可以不用在 `posts.js` 里面实现，这样对应 URL 路径也不会注册到 Router。

## router 实战

下面通过更多实际的例子，来说明 router 的用法。

### 参数获取

#### Query String 方式

```js
// app/router.js
module.exports = (app) => {
  app.router.get('/search', app.controller.search.index);
};

// app/controller/search.js
exports.index = async (ctx) => {
  ctx.body = `search: ${ctx.query.name}`;
};

// curl http://127.0.0.1:7001/search?name=egg
```

#### 参数命名方式

```js
// app/router.js
module.exports = (app) => {
  app.router.get('/user/:id/:name', app.controller.user.info);
};

// app/controller/user.js
exports.info = async (ctx) => {
  ctx.body = `user: ${ctx.params.id}, ${ctx.params.name}`;
};

// curl http://127.0.0.1:7001/user/123/xiaoming
```

#### 复杂参数的获取

路由里面也支持定义正则，可以更加灵活的获取参数：

```js
// app/router.js
module.exports = (app) => {
  app.router.get(
    /^\/package\/([\w-.]+\/[\w-.]+)$/,
    app.controller.package.detail,
  );
};

// app/controller/package.js
exports.detail = async (ctx) => {
  // 如果请求 URL 被正则匹配， 可以按照捕获分组的顺序，从 ctx.params 中获取。
  // 按照下面的用户请求，`ctx.params[0]` 的 内容就是 `egg/1.0.0`
  ctx.body = `package:${ctx.params[0]}`;
};

// curl http://127.0.0.1:7001/package/egg/1.0.0
```

### 表单内容的获取

```js
// app/router.js
module.exports = (app) => {
  app.router.post('/form', app.controller.form.post);
};

// app/controller/form.js
exports.post = async (ctx) => {
  ctx.body = `body: ${JSON.stringify(ctx.request.body)}`;
};

// 模拟发起 post 请求。
// curl -X POST http://127.0.0.1:7001/form --data '{"name":"controller"}' --header 'Content-Type:application/json'
```

> 附：

> 这里直接发起 POST 请求会**报错**：'secret is missing'。错误信息来自 [koa-csrf/index.js#L69](https://github.com/koajs/csrf/blob/2.5.0/index.js#L69) 。

> **原因**：框架内部针对表单 POST 请求均会验证 CSRF 的值，因此我们在表单提交时，请带上 CSRF key 进行提交，可参考[安全威胁 csrf 的防范](https://eggjs.org/zh-cn/core/security.html#安全威胁csrf的防范)

> **注意**：上面的校验是因为框架中内置了安全插件 [egg-security](https://github.com/eggjs/egg-security)，提供了一些默认的安全实践，并且框架的安全插件是默认开启的，如果需要关闭其中一些安全防范，直接设置该项的 enable 属性为 false 即可。

> 「除非清楚的确认后果，否则不建议擅自关闭安全插件提供的功能。」

> 这里在写例子的话可临时在 `config/config.default.js` 中设置

```
exports.security = {
  csrf: false
};
```

### 表单校验

```js
// app/router.js
module.exports = (app) => {
  app.router.post('/user', app.controller.user);
};

// app/controller/user.js
const createRule = {
  username: {
    type: 'email',
  },
  password: {
    type: 'password',
    compare: 're-password',
  },
};

exports.create = async (ctx) => {
  // 如果校验报错，会抛出异常
  ctx.validate(createRule);
  ctx.body = ctx.request.body;
};

// curl -X POST http://127.0.0.1:7001/user --data 'username=abc@abc.com&password=111111&re-password=111111'
```

### 重定向

#### 内部重定向

```js
// app/router.js
module.exports = (app) => {
  app.router.get('index', '/home/index', app.controller.home.index);
  app.router.redirect('/', '/home/index', 302);
};

// app/controller/home.js
exports.index = async (ctx) => {
  ctx.body = 'hello controller';
};

// curl -L http://localhost:7001
```

#### 外部重定向

```js
// app/router.js
module.exports = (app) => {
  app.router.get('/search', app.controller.search.index);
};

// app/controller/search.js
exports.index = async (ctx) => {
  const type = ctx.query.type;
  const q = ctx.query.q || 'nodejs';

  if (type === 'bing') {
    ctx.redirect(`http://cn.bing.com/search?q=${q}`);
  } else {
    ctx.redirect(`https://www.google.co.kr/search?q=${q}`);
  }
};

// curl http://localhost:7001/search?type=bing&q=node.js
// curl http://localhost:7001/search?q=node.js
```

### 中间件的使用

如果我们想把用户某一类请求的参数都大写，可以通过中间件来实现。
这里我们只是简单说明下如何使用中间件，更多请查看 [中间件](./middleware.md)。

```js
// app/controller/search.js
exports.index = async (ctx) => {
  ctx.body = `search: ${ctx.query.name}`;
};

// app/middleware/uppercase.js
module.exports = () => {
  return async function uppercase(ctx, next) {
    ctx.query.name = ctx.query.name && ctx.query.name.toUpperCase();
    await next();
  };
};

// app/router.js
module.exports = (app) => {
  app.router.get(
    's',
    '/search',
    app.middleware.uppercase(),
    app.controller.search,
  );
};

// curl http://localhost:7001/search?name=egg
```

### 太多路由映射？

如上所述，我们并不建议把路由规则逻辑散落在多个地方，会给排查问题带来困扰。

若确实有需求，可以如下拆分：

```js
// app/router.js
module.exports = (app) => {
  require('./router/news')(app);
  require('./router/admin')(app);
};

// app/router/news.js
module.exports = (app) => {
  app.router.get('/news/list', app.controller.news.list);
  app.router.get('/news/detail', app.controller.news.detail);
};

// app/router/admin.js
module.exports = (app) => {
  app.router.get('/admin/user', app.controller.admin.user);
  app.router.get('/admin/log', app.controller.admin.log);
};
```

也可直接使用 [egg-router-plus](https://github.com/eggjs/egg-router-plus)。
