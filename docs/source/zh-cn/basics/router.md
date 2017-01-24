title: router
---

router 主要用来描述请求 URL 和具体承担执行动作的 controller 的对应关系，
框架约定了 `app/router.js` 文件用于统一所有路由规则。

通过统一的配置，我们可以避免路由规则逻辑散落在多个地方，从而出现未知的冲突，集中在一起我们可以更方便的来查看全局的路由规则。

## 如何定义 router

- `app/router.js` 里面定义 url 路由规则

```js
// app/router.js
module.exports = app => {
  app.get('/user/:id', 'user.info');
};
```

- `app/controller` 目录下面实现 controller

```js
// app/controller/user.js
exports.info = function* () {
  this.body = {
    name: `hello ${this.params.id}`,
  };
};
```

这样就完成了一个最简单的 router 定义，当用户执行 `GET /user/123`，`user.js` 这个里面的 info 方法就会执行。

## router 详细定义说明

下面是路由的完整定义，参数可以根据场景的不同，自由选择。

```js
app.verb('path-match', 'controller.action');
app.verb('router-name', 'path-match', 'controller.action');
app.verb('path-match', middleware1, ..., middlewareN, 'controller.action');
app.verb('router-name', 'path-match', middleware1, ..., middlewareN, 'controller.action');
```

路由完整定义主要包括5个主要部分:

- verb - 用户触发动作，支持 get，post 等方法，后面会通过示例详细说明。
  * app.head - HEAD
  * app.options - OPTIONS
  * app.get - GET
  * app.put - PUT
  * app.post - POST
  * app.patch - PATCH
  * app.delete - DELETE
  * app.del - 由于 delete 是一个保留字，所以提供了一个 delete 方法的别名。
  * app.redirect - 可以对 URL 进行重定向处理，比如我们最经常使用的可以把用户访问的根目录路由到某个主页。
- router-name 给路由设定一个别名，可以通过 helper 提供的辅助函数 pathFor 和 urlFor 来生成 url。(可选)
- path-match - 路由 URL 路径。
- middleware1 - 在 router 里面可以配置多个 middleware。(可选)
- controller.action - 注意是字符串，框架会自动从 `app/controller` 目录中区查找同名 controller，
并且把处理指定到配置的 action 方法。如果 controller 文件直接 export 一个方法，可以省略 action。

### 注意事项

- 在 router 定义中， 可以支持多个 middleware 串联执行
- controller 必须定义在 `app/controller` 目录中，并且对应的函数一定要是 generator function。
- 一个文件里面也可以包含多个 controller 定义，在定义路由的时候，
可以通过 `controller-filename.function-name` 的方式指定对应的 controller。

下面是一些路由定义的方式：

```js
app.get('/home', 'home');
app.get('/user/:id', 'user.page');
app.post('/admin', isAdmin, 'admin');
app.post('user', '/user', isLoginUser, hasAdminPermission, 'user.create');
```

### RESTful 风格的 URL 定义

如果想通过 RESTful 的方式来定义路由，
我们提供了 `app.resources('router-name', 'path-match', 'controller-name')` 快速在一个路径上生成 [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) 路由结构。

```js
// app/router.js
module.exports = app => {
  app.resources('posts', '/posts', 'posts');
};
```

上面代码就在 `/posts` 路径上部署了一组 CRUD 路径结构，对应的 controller 为 `app/controller/posts.js` 接下来，
你只需要在 `posts.js` 里面实现对应的函数就可以了。

Method | Path            | Route Name     | Controller.Action
-------|-----------------|----------------|-----------------------------
GET    | /posts          | posts          | app.controllers.posts.index
GET    | /posts/new      | new_post       | app.controllers.posts.new
GET    | /posts/:id      | post           | app.controllers.posts.show
GET    | /posts/:id/edit | edit_post      | app.controllers.posts.edit
POST   | /posts          | posts          | app.controllers.posts.create
PUT    | /posts/:id      | post           | app.controllers.posts.update
DELETE | /posts/:id      | post           | app.controllers.posts.destroy

```js
// app/controller/posts.js
exports.index = function* () {};

exports.new = function* () {};

exports.create = function* () {};

exports.show = function* () {};

exports.edit = function* () {};

exports.update = function* () {};

exports.destroy = function* () {};
```

如果我们不需要其中的某几个方法，可以不用在 `posts.js` 里面实现，这样对应 URL 路径也不会注册到 router。

## router 实战

下面通过更多实际的例子，来说明 router 的用法。

### 参数获取

#### query 方式

```js
// app/router.js
module.exports = app => {
  app.get('/search', 'search');
};

// app/controller/search.js
module.exports = function* () {
  this.body = `search: ${this.query.name}`;
};

// curl http://127.0.0.1:7001/search?name=egg
```

#### 参数命名方式

```js
// app/router.js
module.exports = app => {
  app.get('/user/:id/:name', 'user.info');
};

// app/controller/user.js
exports.info = function* () {
  this.body = `user: ${this.params.id}, ${this.params.name}`;
};

// curl http://127.0.0.1:7001/user/123/xiaoming
```

#### 复杂参数的获取

路由里面也支持定义正则，可以更加灵活的获取参数

```js
// app/router.js
module.exports = app => {
  app.get(/^\/package\/([\w-.]+\/[\w-.]+)$/, 'package.detail');
};

// app/controller/package.js
exports.detail = function* () {
  // 如果请求 URL 被正则匹配， 可以按照捕获分组的顺序，从 this.params 中获取。
  // 按照下面的用户请求，`this.params[0]` 的 内容就是 `egg/1.0.0`
  this.body = `package:${this.params[0]}`;
};

// curl http://127.0.0.1:7001/package/egg/1.0.0
```

### 表单内容的获取

```js
// app/router.js
module.exports = app => {
  app.post('/form', 'form');
};

// app/controller/form.js
module.exports = function* () {
  this.body = `body: ${JSON.stringify(this.request.body)}`;
};

// 模拟发起 post 请求。
// curl -X POST http://127.0.0.1:7001/form --data '{"name":"controller"}' --header 'Content-Type:application/json'
```

> 附：

> 这里直接发起 POST 请求会**报错**：'secret is missing'。错误信息来自 [koa-csrf/index.js#L69](https://github.com/koajs/csrf/blob/2.5.0/index.js#L69) 。

> **原因**：框架内部针对表单 POST 请求均会验证 CSRF 的值，因此我们在表单提交时，请带上 CSRF key 进行提交，可参考[安全威胁csrf的防范](https://eggjs.org/zh-cn/core/security.html#安全威胁csrf的防范)

> **注意**：上面的校验是因为框架中内置了安全插件 [egg-security](https://github.com/eggjs/egg-security)，提供了一些默认的安全实践，并且框架的安全插件是默认开启的，如果需要关闭其中一些安全防范，直接设置该项的 enable 属性为 false 即可。

>「除非清楚的确认后果，否则不建议擅自关闭安全插件提供的功能。」

> 这里在写例子的话可临时在 config/config.default.js 中设置
```
exports.security = {
  csrf: false
};
```

### 表单校验

```js
// app/router.js
module.exports = app => {
  app.post('/user', 'user');
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

exports.create = function* () {
  // 如果校验报错，会抛出异常
  this.validate(createRule);
  this.body = this.request.body;
};

// curl -X POST http://127.0.0.1:7001/user --data 'username=abc@abc.com&password=111111&re-password=111111'
```

### 重定向

#### 内部重定向

```js
// app/router.js
module.exports = app => {
  app.get('index', '/home/index', 'home.index');
  app.redirect('/', '/home/index', 302);
};

// app/controller/home.js
exports.index = function* () {
  this.body = 'hello controller';
};

// curl -L http://localhost:7001
```

#### 外部重定向

```js
// app/router.js
module.exports = app => {
  app.get('/search', 'search');
};

// app/controller/search.js
module.exports = function* () {
  const type = this.query.type;
  const q = this.query.q || 'nodejs';

  if (type === 'bing') {
    this.redirect(`http://cn.bing.com/search?q=${q}`);
  } else {
    this.redirect(`https://www.google.co.kr/search?q=${q}`);
  }
};

// curl http://localhost:7001/search?type=bing&q=node.js
// curl http://localhost:7001/search?q=node.js
```

### 中间件的使用

如果我们想把用户某一类请求的参数都大写，可以通过中间件来实现。
这里我们只是简单说明下如何使用中间件，更多请查看[中间件](./middleware.md)。

```js
// app/controller/search.js
module.exports = function* () {
  this.body = `search: ${this.query.name}`;
};

// app/middleware/uppercase.js
module.exports = () => {
  return function* (next) {
    this.query.name = this.query.name && this.query.name.toUpperCase();
    yield next;
  };
};

// app/router.js
module.exports = app => {
  app.get('s', '/search', app.middlewares.uppercase(), 'search')
};

// curl http://localhost:7001/search2?name=egg
```

### 太多路由映射?

如上所述，我们并不建议把路由规则逻辑散落在多个地方，会给排查问题带来困扰。

若确实有需求，可以如下拆分：

```js
// app/router.js
module.exports = app => {
  require('./router/news')(app);
  require('./router/admin')(app);
};

// app/router/news.js
module.exports = app => {
  app.get('/news/list', 'news.list');
  app.get('/news/detail', 'news.detail');
};

// app/router/admin.js
module.exports = app => {
  app.get('/admin/user', 'admin.user');
  app.get('/admin/log', 'admin.log');
};
```
