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

```js
// config/config.js
exports.middleware = [
  'responseTime',
  'locals',
];
```

通常来说，middleware 是每一个 HTTP 请求都会经过，所以开发者需要明确了解自己开发的中间件前后顺序关系。

例如一个简单的 rt 计算中间件示例如下：

```js
// middleware/response_time.js
module.exports = function(options, app) {
  return function* (next) {
    const start = Date.now();
    yield next;
    const elapsed = Date.now() - start;
    this.set('x-readtime', elapsed);
  };
};
```

#### `app/service`

数据服务逻辑层抽象，如果你在多个 controller 中都写了一段类似代码去取相同的数据，
那就代表很可能需要将这个数据服务层代码重构提取出来，放到 `app/service` 下。

于是我们根据一年多的项目实践，
抽象了一个 `Service` 基类，它只约定了一个构造函数接口：

```js
// Service.js
class Service {
  constructor(ctx) {
    this.ctx = ctx;
    this.app = ctx.app;
    // 这样，你就可以在 Service 子类方法中直接获取到 ctx 和 app 了。
  }

  get proxy() {
    return this.ctx.proxy;
  }
}

module.exports = Service;
```

一个对 User 服务的 Service 封装示例：`UserService.js`

```js
const Service = require('egg').Service;

class UserService extends Service {
  constructor(ctx) {
    super(ctx);
    this.userClient = userClient;
  },

  * get(uid) {
    const ins = instrument(this.ctx, 'buc', 'get');
    const result = yield userClient.get(uid);
    ins.end();
    return result;
  }
}

module.exports = UserService;
```

特别注意的是，`app/service/*.js` 下的文件，每个 `Service` 都会像 `Context` 一样，在
每个请求生成的时候，被自动实例化并且放到 `ctx.service` 下。

```js
├── app
    └── service
        ├── foo_bar      (automatically change file name into Camal-Case, foo_bar => fooBar, foo-bar-ok => fooBarOk)
        |   └── user.js  ==> ctx.service.fooBar.user
        ├── blog.js      ==> ctx.service.blog
        └── user.js      ==> ctx.service.user
```

#### `app/views`

存放模板文件和只在客户端使用的脚本目录文件。 此规范有 view 插件约定。具体规范参见下文的 `模板渲染约定`

#### `app/public` 静态资源目录

针对大部分内部应用，不需要将静态资源发布到 CDN 的场景，都可以将静态资源放到 `app/public` 目录下。 我们会自动对 `public` 目录下的文件，做以下映射：

```js
app/public/js/main.js       => /public/js/main.js
app/public/styles/bluc.css  => /public/styles/blue.css
```

### `app.js`

用于在应用启动的时候做一些初始化工作，一般来说，大部分应用都是不需要此功能的。
如果一个应用使用了一些自定义服务客户端，那么需要做一些服务启动依赖检查的时候，
就可以通过 `app.js` 实现了。

```js
// app.js
const MyClient = require('some-client');

module.exports = function(app) {
  app.myClient = new MyClient();

  const done = app.async('my-client-ready');
  app.myClient.ready(done);
  
  // 如果有异常事件，也需要监听
  app.myClient.once('error', done);
};
```

### `agent.js`

和 `app.js` 类似，在 Agent Worker 进程中，如果需要做一些自定义处理，可以在这个文件中实现。

### koa 扩展约定

在 extend 目录下都是对已有 API 进行扩展，也就是追加到 prototype 上，如 `extend/application.js` 是扩展 Application.prototype。

- `app/extend/request.js`: extend koa request
- `app/extend/response.js`: extend koa response
- `app/extend/context.js`: extend koa context
- `app/extend/application.js`: extend koa application
- `app/extend/agent.js`: extend agent object

### `test`

单元测试目录，我们强制要求所有的 Web 应用都需要有足够多的单元测试保证。

约定好单元测试的目录结构，方便我们的测试驱动脚本统一。

通过目录结构可以看到，`test` 目录下的文件结构会跟 `app` 目录下的文件结构一致，
只是文件名变成了 `*.test.js`：


```sh
. helloweb
├── app
│   ├── controller
│   │   └── home.js
│   ├── middleware (optional)
│   │   └── response_time.js
└── test
    └── controller
        └── home.test.js
    ├── middleware
    |   └── response_time.test.js
```

## 配置文件约定和加载机制

无论是使用 antx，还是 json 作为配置文件格式，最终都是为了生成一份 `{appname}/config/config.js` 配置文件。

```js
module.exports = {
  keys: 'super secure passkey'
};
```

### 运行环境名称约定

因为一份代码需要在不同的运行环境下运行，所以需要约定运行环境的名称。

| name | NODE_ENV | description |
| ---  | ---      | ---         |
| prod | production | production environment，pre-production environment |
| test | production | system integration test environment，a.k.a sit environment  |
| default | production | development server，normally every iteration will apply for a development server |
| local | development or null | local environment, developers computer, which is very likely developing multiple apps  |
| unittest | test | unit test environment, such as developer's local environment and ci environment |

### 根据环境加载配置 `config.*.js` Loading Configs Based on Environment 

- `{appname}/config/config.default.js`: default, all env will load this config
- `{appname}/config/config.prod.js`: prod env config
- `{appname}/config/config.test.js`: test env config
- `{appname}/config/config.local.js`: local env config
- `{appname}/config/config.unittest.js`: unittest env config

#### 配置自动加载流程 Auto Loading of Configs

假设当前环境为 `${env}`，那么最终的配置将按一下顺序加载合并而成。

- 加载顺序：core -> plugin -> app，从内到外顺序加载
- 相同配置优先级：app > plugin > core，最外层的配置覆盖内层的配置

配置文件 loader 过程：

```
egg/config/config.default.js
  ${plugin}/config/config.default.js
    ${app}/config/config.default.js
      egg/config/config.${env}.js
        ${plugin}/config/config.${env}.js
          ${app}/config/config.${env}.js
```

## 插件机制

**为什么有了 koa 的中间件，还需要提出一个插件机制呢?**

因为中间件不能满足很多内部需求，如 diamond-client 入注到应用中，放在中间件不合适，
并且它还有启动检查依赖需求，必须确认 diamond-client 启动成功，才能让应用启动成功。

### 插件能做什么?

一个插件就如一个 mini 应用，它是对应用的扩展，但它不包含 controller 和 router。

- 如需要对 koa 进行扩展，可以通过 `app/extend/request.js, response.js, context.js, application.js` 实现。

- 如需要插入自定义中间件，则可以结合 `app.js` 和 `app/middleware/*.js` 实现。

如将 static 插件的中间件放到应用中间件列表 `app.config.appMiddleware` 的前面：
    
```js
// plugins/static/app.js
const assert = require('assert');

module.exports = function (app) {
  assert.equal(app.config.appMiddleware.indexOf('static'), -1,
    'middleware of custom plugin static has the same name as default middleware static, please set a new name, like appStatic');

  //put static's middleware before bodyParser
  const index = app.config.coreMiddleware.indexOf('bodyParser');
  assert(index >= 0, 'Must have middleware bodyParser');

  app.config.coreMiddleware.splice(index, 0, 'static');
};
```

`app.config.coreMiddleware` 总是会在 `app.config.appMiddleware` 之前被 `app.use` 加载。

- 如需要实现启动依赖检查，则通过 `app.js` 里面使用约定的 `app.readyCallback(asyncName)` 实现。

```js
// app.js
app.myClient = new MyClient();

// ready
app.myClient.ready(app.readyCallback('my-client-ready'));

// event
app.myClient.once('connect', app.readyCallback('my-client-ready'));
```

### 定义插件

以下是一个插件大致的结构，和 app 类似

```sh
. helloclient
├── package.json
├── app.js (optional)
├── agent.js (optional)
├── app
│   ├── extend (optional)
│   |   ├── helper.js (optional)
│   |   ├── request.js (optional)
│   |   ├── response.js (optional)
│   |   ├── context.js (optional)
│   |   ├── application.js (optional)
│   |   └── agent.js (optional)
│   ├── proxy (optional)
│   ├── service (optional)
│   └── middleware (optional)
│       └── my.js
├── config
|   ├── config.default.js
│   ├── config.prod.js
|   ├── config.test.js (optional)
|   ├── config.local.js (optional)
|   └── config.unittest.js (optional)
└── test
    └── middleware
        └── my.test.js
```

在 `pakcage.json` 中定义插件的属性

```json
{
  "name": "egg-mysql",
  "eggPlugin": {
    "name": "egg-mysql",
    "dep": [ "configclient" ],
  }
}
```


- {String} name - 插件名（必须配置），具有唯一性，配置 dep 时会指定依赖插件的 name。
- {Array<String>} dep - 此插件依赖的插件列表
- {Array<String>} env - 只有在指定运行环境才能开启

**注意：插件只能以 dep 的方式依赖，不能通过 npm 依赖**

### 开启和关闭插件

可以在应用或框架使用插件，在 `{appname}/config/plugin.js` 进行配置。

每个配置项有一下配置参数：


- {Boolean} enable - 是否开启此插件
- {String} package - npm 模块名称，允许插件以 npm 模块形式引入 npm module name
- {String} path - 插件绝对路径，跟 package 配置互斥

看看一个示例配置：

```js
module.exports = {
  /**
   * depd plugin, store all deprecated api
   * @member {Object} Plugin#depd
   * @property {Boolean} enable - default true
   * @since 1.0.0
   */
  depd: {
    enable: true,
    path: path.join(__dirname, '../../plugins/depd'),
  },

  /**
   * dataman
   * @member {Object} Plugin#drm
   * @property {Boolean} enable - default true
   * @property {Array} dep - list of dataman starting dependencies
   * @since 1.0.0
   */
  drm: {
    enable: true,
    dep: ['configclient'],
  },

  /**
   * development helper - jsonview
   * add `?__json` to return data in page in json format 
   * @member {Object} Plugin#jsonview
   * @property {Boolean} enable - default true
   * @property {Array} env - open in non-production environment
   * @since 1.0.0
   */
  jsonview: {
    enable: true,
    env: ['local', 'unittest', 'test', 'default', 'net'],
    dep: ['view'],
  },

  // close omeo plug which is opened by default
  omeo: false,
};
```


### 插件命名规则

- 最简单的 pacakge name: `@ali/egg-xx`，`@alipay/egg-xx`，pluginName 为全小写 `xx`

- 比较长的用中划线package name `@ali/egg-foo-bar`，`@alipay/egg-foo-bar`，对应的 pluginName 使用小驼峰，小驼峰转换规则以 package name 的中划线为准 `fooBar`

- 对于可以中划线也可以不用的情况，不做强制约定，例如

  * `sessiontair`(`egg-sessiontair`) or `sessionTair`(`egg-session-tair`)
  * `userservice`(`egg-userservice`) or `user-service`(`egg-user-service`)。
  
只要遵循上两条规则即可，如果选择用中划线，就要按照小驼峰命名 pluginName。


## 多进程模型及进程间通讯 Multi-process Model and Communication Between Processes

![multi-process-model](http://aligitlab.oss-cn-hangzhou-zmf.aliyuncs.com/uploads/node/team/a44668d0ab/multi-process-model.png)
![start-seq](http://aligitlab.oss-cn-hangzhou-zmf.aliyuncs.com/uploads/node/team/202e55b92b/start-seq.png)


### master&worker process

为了最大限度的榨干服务器资源，我们不使用单进程模型。master 进程利用 cluster 根据 CPU 个数启动多个 worker 进程，以达到更好的吞吐率。

### agent process

对于一些公共资源的访问，通用性的操作，例如本地文件监听、与配置中心、DRM交互等，每个 worker 都来一遍非常浪费，且会引发各种问题。故引入 agent 进程，由 master 使用 child_process 启动，它是一个任务执行进程，并不对外提供 http 访问。worker 进程如果有需要可以把这部分任务交给 agent 进程执行，agent 执行后告诉 worker。

不管对于插件还是应用来说，都可以通过在项目根目录放置一个 `agent.js`，在 agent 进程中执行任务。

```sh
. example-package
├── package.json
├── app.js (optional)
|── agent.js (optional)
├── app
├── config
└── test
```

For more guide about `agent.js`, please see [egg-schedule:agent.js](https://github.com/eggjs/egg-schedule/blob/master/agent.js)。

### 进程间通信

![communication-seq](https://github.com/eggjs/egg/blob/master/docs/assets/communication-seq.png)

- agent 由 master 使用 child_process 启动，worker 由 master 使用 cluster 启动，所以 `master<->agent`，`master<->worker` 都可以使用 node 内置的 IPC 通道进行通讯。

- 对于应用运行时，发生最多的是 agent 和 worker 之间的通讯，由 master 转发消息完成，实现了一个虚拟的通道。

在 agent 和 worker 进程中都可以使用 messager 发送和监听消息：

```js
messager.broadcast('msg from agent');
messager.on('msg form worker', callback);
```

可参考 [egg-diamond](http://gitlab.alibaba-inc.com/egg/egg-diamond/tree/master) 中对于 agent 和 worker 之间通讯的实现。

### 健壮性

- master 进程健壮性要求最高，绝对不能挂掉。在 master 进程中不做任何业务代码执行。

- agent 进程会执行公共资源访问类操作，worker 非常需要它，所以 master 进程需要负责 agent 生命周期管理，包括启动和挂掉重启等。

- worker 进程是直接对外提供服务的进程，master 进程同样需要负责 worker 进程的生命周期管理，包括启动和挂掉重启。

## 文件监听

node 自带的文件监听有跨平台兼容问题，并且对文件监听的机制也不尽相同，所以需要一套统一的 API，屏蔽掉不同的实现。详细机制请移步 [egg-watcher](https://github.com/eggjs/egg-watcher)。


## user 约定

对于一个 web 系统，通常都需要登录后获取 user 信息。为了能够实现通用性，其他功能/插件中能够通过统一的 API 获取用户信息，做出以下约定：

- ctx.user 获取用户信息
- ctx.userId 获取用户 id

通常实现的方式，是通过 middleware 从 user store 中获取用户信息和用户 id 挂到 ctx 上，具体用户数据来源不做约定，由具体框架/业务自由选择。

egg 中内置了简单的 userservice 实现，可以通过配置实现自己获取 user 的逻辑。如果不能够满足需求，可以自己单独实现一个 userservice plugin，覆盖默认实现，但需要保持命名 `userservice`。

## 模板渲染约定

对于一个 web 系统，通常都动态渲染页面。为了能够实现通用性，其他功能/插件中能够通过统一的 API 渲染模板，做出以下约定：

- ctx.render(name, locals) - 渲染模板文件, 并赋值给 ctx.body
- ctx.renderString(tpl, locals) - 渲染模板字符串, 仅返回不赋值
- app.view - egg 实例化具体 View 后的引用

通常实现的方式:

- egg 已经实现 ctx.render 和 ctx.renderString
- 框架层需提供具体的 View 模板渲染类, 需提供以下两个接口的实现。
- 模板引擎选型不做约束，由框架/业务自由选择。

> 注意: 如果你写的是独立的 view 插件, 无需在 package.json 中声明对 egg 的依赖


```js
// plugins/nunjucks-view/app/application.js

const egg = require('egg');

class NunjucksView {
  constructor(app) {
    this.app = app;
    // get config info from app.config.view
  }

  /**
   * render template, return finished string
   * @method View#render
   * @param {String} name template file name
   * @param {Object} [locals] variables in page
   * @return {Promise} result string of rendering
   */
  render(name, locals) {
    // Note: render returns a Promise object 
    return Promise.resolve('some html');
  }

  /**
   * render template string
   * @method View#renderString
   * @param {String} tpl template string
   * @param {Object} [locals] variables in page
   * @return {Promise} result string of rendering
   */
  renderString(tpl, locals) {
  }
}

module.exports = {
  get [Symbol.for('egg#view')]() {
    // Note: It's fine to just return class. Egg will turn it to an instance.
    return NunjucksView;
  }
};
```
