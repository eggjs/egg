# Web 基础框架

将实现一个适应阿里，蚂蚁环境的通用 Web 基础框架，包含 Web 应用目录结构约定，
代码加载机制 (Loader)，配置文件约定和加载机制 启动脚本和部署脚本约定，插件机制。

**本文章节:**

- 基础框架基于[koa](http://koajs.com/)
- 基础框架架构
  - `package.json`
  - `app` (文件夹)
    - `app/router.js`
    - `app/controller`
    - `app/middleware`
    - `app/service`
    - `app/proxy`
    - `app/public` (静态资源文件夹)
  - `app.js`
  - koa extension
  - `test`
- 配置文件约定和加载机制
  - 运行环境名称约定
- 插件机制 
  - 插件能做什么
  - 开启和关闭插件
  - 插件命名规则
- 多进程模型及进程间通讯
  - master&worker 进程 
  - agent 进程
  - 进程间通信 
  - 健壮性 
- 文件监听 
- user 约定

## 基础框架基于`koa`

选择基于 [koa](http://koajs.com/)，是因为它是当前解决异步编程最好的 Web 通用框架。并且将在 2016 年自动适配 async-await 的 es2016 推荐的异步编程方案。我们已经对它的所有源代码 100% 掌握并且参与到核心代码贡献中。

## Web 应用目录结构约定和加载机制

此约定只限制本文描述的目录，不在本文描述的目录范围的其他目录，不在本约定范围。

以一个名称为 `helloweb` 的应用为例，它的目录结构如下：

```sh
. helloweb
├── package.json
├── app.js (optional)
├── agent.js (optional)
├── app
│   ├── router.js
│   ├── controller
│   │   └── home.js
│   ├── extend (optional，for egg extention)
│   │   ├── helper.js (optional)
│   │   ├── filter.js (optional)
│   │   ├── request.js (optional)
│   │   ├── response.js (optional)
│   │   ├── context.js (optional)
│   │   ├── application.js (optional)
│   │   └── agent.js (optional)
│   ├── service (optional)
│   ├── public (optional)
│   │   ├── favicon.ico
│   │   └── ...
│   ├── middleware (optional)
│   │   └── response_time.js
│   └── view (optional, base view plugin rule, we suggest to use views)
│       ├── layout.html
│       └── home.html
├── config
│   ├── config.default.js
│   ├── config.prod.js
│   ├── config.test.js (optional)
│   ├── config.local.js (optional)
│   ├── config.unittest.js (optional)
│   ├── plugin.js
│   └── role.js (optional, we use role as an example of plugin, special config file for plugin should be placed in config directory)
└── test
    ├── middleware
    |   └── response_time.test.js
    └── controller
        └── home.test.js
```

### `package.json`

每个应用都必须包含 `package.json` 文件。

每个 `package.json` 至少包含以下配置项：

- `name`：表示当前应用名，并且应用名需要跟 `aone` 上的一致。
- `engines`：复用 `engines` 字段，用来表示当前应用所依赖的 Node 版本。

### `app` directory

`app` 目录是一个应用业务逻辑代码存放的地方。
它是整个应用的核心目录，包含 `router.js`，`controller`，`views`，`middleware` 等常用功能目录。
同时还包含可选的 `service`，`proxy` 等服务调用相关功能代码目录。

#### `app/router.js`

`app/router.js` 是应用的路由配置文件，所有路由配置都在此设置，
放在同一个文件非常方便通过 url 查找到对应的 `controller` 代码。

所有 `router.js` 文件约定的入口都是一个 `function(app)` 接口，
会自动传入当前的 app 实例对象，
开发者就可以通过 app 的路由方法 `get`, `post`, `put`, `delete`, `head` 等设置路由配置项。

Here is an example for `router.js`:

```js
module.exports = function(app) {
  app.get('/', app.controller.home);
  app.post('/blog/:id/upload', app.controller.blog.upload);
};
```

```js
module.exports = app => {
  app.get('/', app.controller.home);
  app.get('/forget', app.controller.forget);
  app.post('/remember', app.controller.remember);
};
```

#### `app/controller`

每个 `app/controller/*.js` 文件，都会被自动加载到 `app.controller.*` 上。
这样就能在 `app/router.js` 里面方便地进行路由配置。

以下目录将按约定加载：

```js
├── app
    └── controller
        ├── foo_bar      (automatically change name to Camel-Case, foo_bar => fooBar, foo-bar-ok => fooBarOk)
        |   └── user.js  ==> app.controller.fooBar.user
        ├── blog.js      ==> app.controller.blog
        └── home.js      ==> app.controller.home
```

`controller` 就是一个普通的 koa middleware，格式为 `function*([next])`：

`controller` is a Koa (v1) middleware. Use the generator format, (star function), for example `function*([next])`;

```js
// home.js
module.exports = function*() {
  this.body = 'hello world';
};
```


```js
// blog.js
exports.upload = function*() {
  // handle file upload
};
```

通常来说，controller 是一个 HTTP 请求链中最后的一个处理者，
按约定不太可能一个 HTTP 请求会经过 2 个 controller 的。

在 controller 中可以调用 `service`，`proxy` 等依赖目录。

#### `app/middleware`

应用自定义中间件都放在此目录，然后需要在 `config/config.default.js` 配置中间件的启动顺序。

通常来说，middleware 是每一个 HTTP 请求都会经过，所以开发者需要明确了解自己开发的中间件前后顺序关系。