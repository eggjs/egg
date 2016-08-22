# Base Web Framework 

Egg is an open-source web framework for building a flexible Node.js web and mobile applications. It includes a series of rules that defines the file structure of a web application, loaders, configurations, scheduler scripts, and plugins system.


**Glossary:**

- Based on [koa](http://koajs.com/)
- Web application file structure and loading process
  - `package.json`
  - `app` (directory)
    - `app/router.js`
    - `app/controller`
    - `app/middleware`
    - `app/service`
    - `app/proxy`
    - `app/public` (static resources directory)
  - `app.js`
  - koa extension
  - `test`
- Configuration file and configuration loader
  - Environmental variables naming rules
- Plugins 
  - What is a plugin
  - Opening and closing a plugin
  - Naming a plugin 
- Multi-process model and communication between processes
  - Master & worker process
  - Agent process
  - Communication between multiple processes
  - Robustness
- File Watching
- User object

## Based on Koa

`Koa` is a web framework designed by the team behind Express, which aims to be a smaller, more expressive, and more robust foundation for web applications and APIs. 

**Egg** framework is built on top of `Koa` and its ecosystem. The [core contributors of **egg** framework](https://github.com/eggjs/egg/graphs/contributors) are also the core contributors of [`koa` web framework](https://github.com/koajs/koa/graphs/contributors). In addition, We are maintaining [many](https://github.com/repo-utils) [Node.js](https://github.com/node-modules) [open source](https://github.com/stream-utils) [projects](https://github.com/cojs) across the entire Node.js ecosystem.

**Egg** framework is originated from **Alibaba** internal Node.js web framework. It is an open source version of what **Alibaba** Node.js team used. It is based on what the team have learned from maintaining production applications over the course of five years.


## Web Application File Structure and Loading Process

This rule is only for the directories that are mentioned later in this section. For file directories that is not coverd, this rule is not applicable.

**Egg** is an opinionated framework for creating ambitious Node.js web applications. Simply following the naming convention, our friendly APIs help you get your job done fast.

Let's use an app called `helloweb` as an example. Its file structure may look like following: 

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

Like all Node.js application, it must contain a `package.json` file. It should have following attributes:

- `name`: Application name
- `engines`: It specifies the Node.js version that the application depends on. Use `install-node` attribute to get the required version of Node, For example `4.1.1` is required.
```json
"name": "helloweb"
"engines": {
  "install-node": "4.1.1"
}
```

### `app` directory

`app` directory is used to store central logic of this application. 

`app` directory can include directories, such as `controller`, `public`, `middleware`, `schedule`, `apis` etc. The files that were contained in those directories would be loaded automatically by [egg-core](https://github.com/eggjs/egg-core)

`app` directory can include files, such as `router.js`. Those files are stored at the root of `app` directory and would be loaded loaded automatically by [egg-core](https://github.com/eggjs/egg-core).

#### `app/router.js`

`app/router.js` contains the routing configuration for the entire application. We use [koa-router](https://github.com/alexmingoia/koa-router) middleware under the hood, so that `koa-router`'s [APIs](https://github.com/alexmingoia/koa-router#api-reference) are applied fully here. 

`router.js` file exports a function that takes a single parameter called `app`. The `app` object is an instance of the **Egg** application. On `app` object, you can use route methods, for example, `get`, `post`, `put`, `delete`, `head`, and much more, to achieve routing functionality. The route interface takes two parameters. First parameter is a string representation of the application partial URL. Second parameter is the controller function is called when the partial URL has been matched.

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

Every `app/controller/*.js` file will be automatically loaded into `app.controller.*`, thanks for the loader, [egg-core](https://github.com/eggjs/egg-core)

The following example explains how a directory is loaded:

```js
├── app
    └── controller
        ├── foo_bar      (automatically change name to Camel-Case, foo_bar => fooBar, foo-bar-ok => fooBarOk)
        |   └── user.js  ==> app.controller.fooBar.user
        ├── blog.js      ==> app.controller.blog
        └── home.js      ==> app.controller.home
```

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

Generally, a HTTP request will be handled by one controller. A controller function is the last handler in the middleware chain of executing HTTP request. 

A Controller can call dependent directories, such as `service`, `proxy` etc. 

#### `app/middleware`

All custom middlewares should be placed in this directory. The execution order of the middlewares should be declared in `config/config.${env}.js`.

```js
// config/config.js
exports.middleware = [
  'responseTime',
  'locals',
];
```

Generally speaking, middleware is used for every HTTP request, so developers should have a clear awareness about the order that middlewares are used.

例如一个简单的 rt 计算中间件示例如下：
For example, here is a simple middleware to calculate rt:

```js
// middleware/response_time.js
module.exports = function(options, app) {
  return function*(next) {
    const start = Date.now();
    yield next;
    const use = Date.now() - start;
    this.set('x-readtime', use);
  };
};
```

#### `app/service`

数据服务逻辑层抽象，如果你在多个 controller 中都写了一段类似代码去取相同的数据，
那就代表很可能需要将这个数据服务层代码重构提取出来，放到 `app/service` 下。
Abstraction of logic of data services. If serveral lines of code are repeated in multiple controllers to get same kind of data, it should be rewritten as a service and be placed in `app/service`.

于是我们根据一年多的项目实践，
抽象了一个 `Service` 基类，它只约定了一个构造函数接口：
Based on the experience of working in our project for more than one year,
we classify a base of `Service`, which only provides a contructor for service:

```js
// Service.js

class Service {
  constructor(ctx) {
    this.ctx = ctx;
    this.app = ctx.app;
    // 这样，你就可以在 Service 子类方法中直接获取到 ctx 和 app 了。
    // So, you can use ctx and app in class extended from Service.
  }

  get proxy() {
    return this.ctx.proxy;
  }
}

module.exports = Service;
```

一个对 User 服务的 Service 封装示例：`UserService.js`
An example that explains how to pack UserService as a Service.

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
Note: Every service defined in `app/service/*.js` will be injected into `ctx.service` just like `Content`, when the request is formed.

```js
├── app
    └── service
        ├── foo_bar      (automatically change file name into Camal-Case, foo_bar => fooBar, foo-bar-ok => fooBarOk)
        |   └── user.js  ==> ctx.service.fooBar.user
        ├── blog.js      ==> ctx.service.blog
        └── user.js      ==> ctx.service.user
```

#### `app/views`

此规范有 view 插件约定。具体规范参见下文的 `模板渲染约定`
This part rule can refer to view guide. For more detail, please see `template rendering guide` 

存放模板文件和只在客户端使用的脚本目录文件。
This directory is used to store template files in scripts used in client-side.

#### `app/public` 静态资源目录 static resource directory

针对大部分内部应用，不需要将静态资源发布到 CDN 的场景，都可以将静态资源放到 `app/public` 目录下。
For scenarios that don't require to push static resource into CDN, like internal apps, just put static resource into `app/public`. 

我们会自动对 `public` 目录下的文件，做以下映射：
We will automatically construct such mapping for files in public directory:

```js
app/public/js/main.js       => /public/js/main.js
app/public/styles/bluc.css  => /public/styles/blue.css
```

### `app.js`

用于在应用启动的时候做一些初始化工作，一般来说，大部分应用都是不需要此功能的。
如果一个应用使用了一些自定义服务客户端，那么需要做一些服务启动依赖检查的时候，
就可以通过 `app.js` 实现了。
It is used to do initializing work when an app starts. Normally, most apps don't need this feature.
If an app uses some custom services in client-side, then it may need to check the status of dependencies when the services start. Those inspections can be placed in `app.js`.

```js
// app.js
const MyClient = require('some-client');

module.exports = function(app) {
  app.myClient = new MyClient();

  const done = app.async('my-client-ready');
  app.myClient.ready(done);
  // 如果有异常事件，也需要监听
  // listen for exception, if necessary.
  app.myClient.once('error', done);
};
```

### `agent.js`

和 `app.js` 类似，在 Agent Worker 进程中，如果需要做一些自定义处理，可以在这个文件中实现。
Similar to `app.js`, in the process of Agent Worker, if you need some customizations, you can put them into this file.

### koa 扩展约定 Extension Guide

在 extend 目录下都是对已有 API 进行扩展，也就是追加到 prototype 上，如 `extend/application.js` 是扩展 Application.prototype。
All extensions in extend directory is used to extend original existing API. In other words, the extension is added to prototype. For example, `extend/application.js` extends Application.prototype.

- `app/extend/request.js`: extend koa request
- `app/extend/response.js`: extend koa response
- `app/extend/context.js`: extend koa context
- `app/extend/application.js`: extend koa application
- `app/extend/agent.js`: extend agent object

### `test`

单元测试目录，我们强制要求所有的 Web 应用都需要有足够多的单元测试保证。
Unit test directory. We require all Web apps have enough tests to assure its functionality.

约定好单元测试的目录结构，方便我们的测试驱动脚本统一。
Having a designated test directory is convenient to run testing scripts.

通过目录结构可以看到，`test` 目录下的文件结构会跟 `app` 目录下的文件结构一致，
只是文件名变成了 `*.test.js`：
Based on directory structure, `test` directory should have the same structure as `app` directory, except the file name changing from `*.js` to `*.test.js`: 

```sh
. helloweb
├── app
│   ├── controller
│   │   └── home.js
│   ├── middleware (optional)
│   │   └── response_time.js
└── test
    ├── middleware
    |   └── response_time.test.js
    └── controller
        └── home.test.js
```

## 配置文件约定和加载机制 Config Guide and Loading Process 

无论是使用 antx，还是 json 作为配置文件格式，最终都是为了生成一份 `{appname}/config/config.js` 配置文件。
Either using antx or using json as format of config file, essentially, is to generate a config file named `{appname}/config/config.js`.

### 运行环境名称约定 Running Environment Name Guide

因为一份代码需要在不同的运行环境下运行，所以需要约定运行环境的名称。
The same set of code needs to run in different environments, so we need to appoint names for environments.

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
- `{appname}/config/config.unittest.js`: local env config

#### 配置自动加载流程 Auto Loading of Configs

假设当前环境为 `${env}`，那么最终的配置将按一下顺序加载合并而成。
Suppose the current environment is `${env}`, the final configuration will be built based on the following hierarchy.

- 加载顺序：core -> plugin -> app，从内到外顺序加载
- Loading order: core -> plugin -> app. Loading from inside to outside
- 相同配置优先级：app > plugin > core，最外层的配置覆盖内层的配置
- Priority: app > plugin > core. Outer config can replace inner config

配置文件 loader 过程：
The process of loading config files by loader:

```
egg/config/config.default.js
  ${plugin}/config/config.default.js
    ${app}/config/config.default.js
      egg/config/config.${env}.js
        ${plugin}/config/config.${env}.js
          ${app}/config/config.${env}.js
```

## 插件机制 Plugins

为什么有了 koa 的中间件，还需要提出一个插件机制呢？
Koa already provides the concept of middleware. Why we still need plugins?

因为中间件不能满足很多内部需求，如 diamond-client 入注到应用中，放在中间件不合适，
并且它还有启动检查依赖需求，必须确认 diamond-client 启动成功，才能让应用启动成功。
Because in some specific situation, middleware cannot satisfy the requirement. We could use diamond-client as an example of plugin. It need to be injected into apps, so not suitable to be a middleware. Moreover, it requires to some inpections to its dependencies before starting. diamond-client needs to be starts prior to the app. 

### 插件能做什么 What a plugin can do?

一个插件就如一个 mini 应用，它是对应用的扩展，但它不包含 controller 和 router。
A plugin is like a mini app. It is an extension for app, but excluding controller and router.

- 如需要对 koa 进行扩展，可以通过 `app/extend/request.js, response.js, context.js, application.js` 实现。
- If you need to extend koa, you can edit `app/extend/request.js, response.js, context.js, application.js`.
- 如需要插入自定义中间件，则可以结合 `app.js` 和 `app/middleware/*.js` 实现。
- If you need to add custom middleware, edit `app.js` and `app/middleware/*.js`.

    如将 static 插件的中间件放到应用中间件列表 `app.config.appMiddleware` 的前面：
    For example, put middleware of static plugin before list of app middlewares `app.config.appMiddleware`.
    
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
    `app.use` will always load `app.config.coreMiddleware` before `app.config.appMiddleware`.

- 如需要实现启动依赖检查，则通过 `app.js` 里面使用约定的 `app.readyCallback(asyncName)` 实现。
- To inspect status of dependencies before starting, use `app.readyCallback(asyncName)`

    ```js
    // app.js
    app.myClient = new MyClient();
    // ready
    app.myClient.ready(app.readyCallback('my-client-ready'));
    // event
    app.myClient.once('connect', app.readyCallback('my-client-ready'));
    ```

### 定义插件 Writing a plugin

以下是一个插件大致的结构，和 app 类似
Here is a example of plugin, whose structure is similar to app.

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
define attributes of plugin in `package.json`

```json
{
  "name": "egg-mysql",
  "eggPlugin": {
    "name": "egg-mysql",
    "dep": [ "configclient" ],
  }
}
```

- {String} name - 插件名（必须配置），具有唯一性，配置 dep 时会指定依赖插件的 name。plugin name(must have), should be a unique name.
- {Array<String>} dep - 此插件依赖的插件列表 dependencies for this plugin
- {Array<String>} env - 只有在指定运行环境才能开启 only running in designated environment

**注意：插件只能以 dep 的方式依赖，不能通过 npm 依赖**
**Note: plugin's dependencies must be listed in dep. Using 'dependencies' from npm won't be effective**

### 开启和关闭插件 Openning and Closing a Plugin

可以在应用或框架使用插件，在 `{appname}/config/plugin.js` 进行配置。
Modify `{appname}/config/plugin.js` to use plugin in app.

每个配置项有一下配置参数：
Every configuration has server parameters:

- {Boolean} enable - 是否开启此插件 open this plugin or not
- {String} package - npm 模块名称，允许插件以 npm 模块形式引入 npm module name, allowing plugin to be imported as npm module
- {String} path - 插件绝对路径，跟 package 配置互斥 Absolute path for plugin

看看一个示例配置：
Here is an example config:

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

### 插件命名规则 Naming a Plugin 

- 最简单的 pacakge name: `@ali/egg-xx`，`@alipay/egg-xx`，pluginName 为全小写 `xx`
- simplest package name: `egg-xx`. corresponding `pluginName` should be in lowercase.
- 比较长的用中划线package name `@ali/egg-foo-bar`，`@alipay/egg-foo-bar`，对应的 pluginName 使用小驼峰，小驼峰转换规则以 package name 的中划线为准 `fooBar`
- longer name can use hyphen: `egg-foo-bar`, corresponding pluginName should be in small Camel-Case.
- 对于可以中划线也可以不用的情况，不做强制约定，例如
- Hyphen is not compulsory, for example:
  * `sessiontair`(`egg-sessiontair`) or `sessionTair`(`egg-session-tair`)
  * `userservice`(`egg-userservice`) or `user-service`(`egg-user-service`)。

  只要遵循上两条规则即可，如果选择用中划线，就要按照小驼峰命名 pluginName。
  Follow the rules above. If you choose to use hyphen, pluginName should be in small Camel-Case.

## 多进程模型及进程间通讯 Multi-process Model and Communication Between Processes

![multi-process-model](http://aligitlab.oss-cn-hangzhou-zmf.aliyuncs.com/uploads/node/team/a44668d0ab/multi-process-model.png)
![start-seq](http://aligitlab.oss-cn-hangzhou-zmf.aliyuncs.com/uploads/node/team/202e55b92b/start-seq.png)

### master&worker process

为了最大限度的榨干服务器资源，我们不使用单进程模型。master 进程利用 cluster 根据 CPU 个数启动多个 worker 进程，以达到更好的吞吐率。
To fullly use server resource, we don't use single-process model. Based on number of processors, master process use cluster to start multiple processes.

### agent process

对于一些公共资源的访问，通用性的操作，例如本地文件监听、与配置中心、DRM交互等，每个 worker 都来一遍非常浪费，且会引发各种问题。故引入 agent 进程，由 master 使用 child_process 启动，它是一个任务执行进程，并不对外提供 http 访问。worker 进程如果有需要可以把这部分任务交给 agent 进程执行，agent 执行后告诉 worker。
It is a huge waste of performance, if every worker process needs to do work about public resources or universal operations, such as watching local files and comminucate with remote configuration provider. Therefore, we create a new type of process, agent process. Agent process is created by master process using child_process. It is a task execution process, which doesn't response to external http request. In some scenario with huge workload, worker process can ask agent process for help. Worker process can share part of task with agent process. Agent process will notify worker process when the task is finished.

不管对于插件还是应用来说，都可以通过在项目根目录放置一个 `agent.js`，在 agent 进程中执行任务。
Therefore plugin and app can use agent process to execute tasks by writing a `agent.js` file.

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

### 进程间通信 Communication Between Multiple Processes

![communication-seq](https://github.com/eggjs/egg/blob/master/docs/assets/communication-seq.png)

* agent 由 master 使用 child_process 启动，worker 由 master 使用 cluster 启动，所以 `master<->agent`，`master<->worker` 都可以使用 node 内置的 IPC 通道进行通讯。
* agent process is created by master process using child_process, while worker process is created by master process using cluster. Therefore, `master<->agent`, `master<->worker` can use IPC channel from node to communicate with each other.
* 对于应用运行时，发生最多的是 agent 和 worker 之间的通讯，由 master 转发消息完成，实现了一个虚拟的通道。
* When app is running, the most frequent communication is between agent and worker, which is a virtual channel redirected by master.

    在 agent 和 worker 进程中都可以使用 messager 发送和监听消息：
    agent and worker process can use messager send and receive messages:
    
    ```js
    messager.broadcast('msg from agent');
    messager.on('msg form worker', callback);
    ```

可参考 [egg-diamond](http://gitlab.alibaba-inc.com/egg/egg-diamond/tree/master) 中对于 agent 和 worker 之间通讯的实现。
See more in [egg-diamond](http://gitlab.alibaba-inc.com/egg/egg-diamond/tree/master) about communication between agent and worker process.

### 健壮性 Robustness

* master 进程健壮性要求最高，绝对不能挂掉。在 master 进程中不做任何业务代码执行。
* Master process has the highest requirement for robustness. It should not be closed by any time. In master process, there is no any functional operation.
* agent 进程会执行公共资源访问类操作，worker 非常需要它，所以 master 进程需要负责 agent 生命周期管理，包括启动和挂掉重启等。
* Agent process is responsible to require all public resources. Worker process reples on it very heavily. So master process need to control the lifecycle of agent process including starting and restrating if it is closed.
* worker 进程是直接对外提供服务的进程，master 进程同样需要负责 worker 进程的生命周期管理，包括启动和挂掉重启。
* worker process is the process that response to external requests. Master process also controls the lifecycle of worker process, including starting and restarting if it is closed.

## 文件监听 File Watching

node 自带的文件监听有跨平台兼容问题，并且对文件监听的机制也不尽相同，所以需要一套统一的 API，屏蔽掉不同的实现。详细机制请移步 [egg-watcher](https://github.com/eggjs/egg-watcher)。
The built-in file watcher from Node has cross-platform compatibility problem. To get a consisitent system of file watcher please see [egg-watcher](https://github.com/eggjs/egg-watcher).

## user 约定 User Object

对于一个 web 系统，通常都需要登录后获取 user 信息。为了能够实现通用性，其他功能/插件中能够通过统一的 API 获取用户信息，做出以下约定：
For a Web application, login and store of user information is an inevitable function. To be consistent so that other plugins can get user information easily, we have the following rules for API:   

* ctx.user 获取用户信息
* ctx.user to get user information
* ctx.userId 获取用户 id
* ctx.userId to get user id

通常实现的方式，是通过 middleware 从 user store 中获取用户信息和用户 id 挂到 ctx 上，具体用户数据来源不做约定，由具体框架/业务自由选择。
Generally, the rules above are implemented through middleware, who get user information and user id from user store and attach them into ctx object. 

egg 中内置了简单的 userservice 实现，可以通过配置实现自己获取 user 的逻辑。如果不能够满足需求，可以自己单独实现一个 userservice plugin，覆盖默认实现，但需要保持命名 `userservice`。
There is a built-in implementation of userservice in Egg. You can use config files to implement how to get user information. If that is not good enough, feel free to write a userservice plugin, and override the built-in implementation. Make sure the plugin is named as `userservice`. 

## 模板渲染约定 Template Rendering

对于一个 web 系统，通常都动态渲染页面。为了能够实现通用性，其他功能/插件中能够通过统一的 API 渲染模板，做出以下约定：
A Web system usually needs to dynamically render template to page. We also set some rules for API of template rendering:

- ctx.render(name, locals) 渲染模板文件, 并赋值给 ctx.body
- ctx.render(name, locals) render template file, and assign value for ctx.body
- ctx.renderString(tpl, locals) 渲染模板字符串, 仅返回不赋值
- ctx.renderString(tpl, locals) render template string. Not assign value, only return value.
- app.view egg 实例化具体 View 后的引用
- app.view instance of View class contructed by Egg

通常实现的方式:
- egg 已经实现 ctx.render 和 ctx.renderString
- 框架层需提供具体的 View 模板渲染类, 需提供以下两个接口的实现。
- 模板引擎选型不做约束，由框架/业务自由选择。
Common Implementation:
- Egg has already set two interfaces: ctx.render and ctx.renderString.
- Other framework should provide specific View class and implementation of these two interfaces.
- Template engine is not restricted. Feel free to use as you wish.

> 注意: 如果你写的是独立的 view 插件, 无需在 package.json 中声明对 egg 的依赖
> Note: If you are writing a separate view plugin, there is no need to add egg as a dependency.  

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

