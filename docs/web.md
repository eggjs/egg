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

Generally speaking, middleware is executed by every HTTP requests so that you should have a clear awareness about the order that middlewares are executed.

For example, here is a simple middleware to calculate `response time`:

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

You can use **services** to organize and share code across your application.

Here is an base `Service` class, and you can extend it to make your own services:

```js
// Service.js
class Service {
  constructor(ctx) {
    this.ctx = ctx;
    this.app = ctx.app;
    // So, you can use ctx and app in class extended from Service.
  }

  get proxy() {
    return this.ctx.proxy;
  }
}

module.exports = Service;
```

An example that shows `UserService` extends the base `Service`:

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

Each service is defined in `app/service/*.js` will be injected into `ctx.service`. For example, `app/service/user.js` service class can be accessed by `ctx.service.user`. Because of `ctx` is defined in application level, it can be accessed in every middlewares.

```js
├── app
    └── service
        ├── foo_bar      (automatically change file name into Camal-Case, foo_bar => fooBar, foo-bar-ok => fooBarOk)
        |   └── user.js  ==> ctx.service.fooBar.user
        ├── blog.js      ==> ctx.service.blog
        └── user.js      ==> ctx.service.user
```

#### `app/views`

This directory is used to store template files in scripts used in rendering client side view templates. For more detail, please see `template rendering guide` 

#### `app/public`

This directory is used to store static resources, such as 'favicon', 'images', 'fonts', etc. 

**Egg** framework serves files in public directory at an absolute url `${domain}/public/${path-to-file}`

```js
app/public/js/main.js       => /public/js/main.js
app/public/styles/bluc.css  => /public/styles/blue.css
```

### `app.js`

`app.js` is responsible to do initializing work when an application starts. In general, most apps don't need this feature. 

When an application starts and uses some custom services in client-side, it may need to check the dependencies status. Those inspections can be placed in `app.js`.

```js
// app.js
const MyClient = require('some-client');

module.exports = function(app) {
  app.myClient = new MyClient();

  const done = app.async('my-client-ready');
  app.myClient.ready(done);

  // listen for exception, if necessary.
  app.myClient.once('error', done);
};
```

### `agent.js`

Similar to `app.js`, `agent.js` is responsible to do initializing work when an agent worker starts.

### Koa Extension Guide

All extensions in `extend` directory is used to extend `Koa` framework APIs. In another words, the extension is added to `Koa` application prototype. For example, `extend/application.js` extends `Application.prototype`.

- `app/extend/request.js`: extend koa request
- `app/extend/response.js`: extend koa response
- `app/extend/context.js`: extend koa context
- `app/extend/application.js`: extend koa application
- `app/extend/agent.js`: extend agent object

### `test`

All unit tests and integration tests goes into this directory. Group all your tests files into the central location is convenient to run testing scripts.

`test` directory is based on current directory structure. It should have the same structure as `app` directory, except the file name end with `*.test.js`: 

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

## Config Guide and Loading Process 

```js
// config/config.default.js
module.exports = {
  keys: 'super secure passkey'
};
```

### Running Environment Guide

Configuration settings to run in different environments.

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

Suppose the current environment is `${env}`, the final configuration will be built based on the following hierarchy.

- Loading order: loading from inside to outside
    
    `core -> plugin -> app`
    
- Priority: Outer config can replace inner config

    `app > plugin > core`

The process of loading config files by loader:

```
egg/config/config.default.js
  ${plugin}/config/config.default.js
    ${app}/config/config.default.js
      egg/config/config.${env}.js
        ${plugin}/config/config.${env}.js
          ${app}/config/config.${env}.js
```

## Plugins

**Koa has the concept of middleware. Why do we still need *plugins*?**

In short, middleware cannot satisfy the requirement in some specific situation. 

We could use diamond-client as an example. It need to be injected into applications, so it is not suitable to be a middleware. Moreover, diamond-client needs to be started before the application starts so that it requires to have some inspections to its dependencies.

### What a plugin can do?

A plugin is like a small application. It is an extension for application, but does not have `controller` and `router`.

- If you need to extend koa, simply create files like `app/extend/request.js, app/extend/response.js, app/extend/context.js, app/extend/application.js`.

- If you need to add custom middlewares, edit `app.js` and create `app/middleware/*.js`.

For example, ensure `bodyParser` middleware is present and `static plugin` is executed before other middlewares that lists inside `app.config.appMiddleware`.
    
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

`app.use` will always load `app.config.coreMiddleware` before `app.config.appMiddleware`.

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

- {String} name - plugin name is required and should be a unique name.
- {Array<String>} dep - dependencies for this plugin
- {Array<String>} env - only running in designated environment

**Note: plugin's dependencies must be listed in `dep` property. Using NPM 'dependencies' are not allowed!**

### Openning and Closing a Plugin

Modify `{appname}/config/plugin.js` to use plugin in an application.

Every configuration has server parameters:

- {Boolean} enable - enable this plugin or not
- {String} package - allow plugin to be imported as npm module
- {String} path - absolute path for plugin

For example,

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

### Naming a Plugin 

- simplest package name: `egg-xx`. corresponding `pluginName` should be in lowercase.

- Use hyphen separated format for longer name, for example: `egg-foo-bar`, corresponding pluginName should be in small Camel-Case, `fooBar`.

- Hyphen is not compulsory, for example:

  * `sessiontair`(`egg-sessiontair`) or `sessionTair`(`egg-session-tair`)
  * `userservice`(`egg-userservice`) or `user-service`(`egg-user-service`)。

Follow the rules above. If you choose to use hyphen, pluginName should be in small Camel-Case.

## Multi-process Model and Communication Between Processes

![multi-process-model](http://aligitlab.oss-cn-hangzhou-zmf.aliyuncs.com/uploads/node/team/a44668d0ab/multi-process-model.png)
![start-seq](http://aligitlab.oss-cn-hangzhou-zmf.aliyuncs.com/uploads/node/team/202e55b92b/start-seq.png)

### master&worker process

To take advantage of existing server resource, master process start a cluster with multiple processes based on number of processors.

### agent process

Some of common work can be done on a central process, then facilitate the results to `worker` process. For example, accessing public resources, executing universal operations, watching local files, communicating with remote configuration providers, etc.

Therefore, we create a new type of process, `agent process`. It is created by master process using `child_process`. It is a task execution process, which doesn't response to external http request. In some scenario with huge workload, `worker` process can ask `agent` process for help. Worker process can share part of task with agent process. Agent process will notify worker process when the task is finished.

Therefore `plugin` and `app` can use `agent` process to execute tasks by writing a `agent.js` file.

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

### Communication Between Multiple Processes

![communication-seq](https://github.com/eggjs/egg/blob/master/docs/assets/communication-seq.png)

- `agent` process is created by `master` process using `child_process`. `worker` process is created by `master` process using cluster. Therefore, `master<->agent`, `master<->worker` can use IPC channel from node to communicate with each other.

- When app is running, the most frequent communication is between agent and worker. That is being done by a virtual channel redirected by master.

`agent` and `worker` process can use `messager` send and receive messages:
    
```js
messager.broadcast('msg from agent');
messager.on('msg form worker', callback);
```

See details in [egg-diamond](http://gitlab.alibaba-inc.com/egg/egg-diamond/tree/master) about communication between agent and worker process.

### Robustness

- Master process has the highest requirement for robustness. At any given time, master process need to be healthy and it should not run any functional operation.

- Agent process is responsible to execute common tasks and heavy work load. Worker process depends on it. Master process is in control the lifecycle of agent process including start and restart if agent process is terminated.

- worker process is the process that response to external requests. Master process is in controls the lifecycle of worker process, including starting and restarting if it is terminated.

## File Watching

The Node.js built-in file watcher has a cross-platform compatibility problem. To get a consistent system of file watcher, please see [egg-watcher](https://github.com/eggjs/egg-watcher).

## User Object

For a Web application, login and store of user information is an inevitable function. To be consistent so that other plugins can get user information easily, we have the following rules for API:   

- ctx.user - to get current user information
- ctx.userId - to get user id

Generally, the rules above are implemented through middleware, which is responsible to get user information and user id from user store and inject into `ctx` object. 

**Egg** has a built-in implementation of `userservice`. You can use config files to implement how to get user information. If that is not good enough, feel free to write a `userservice` plugin, and override the built-in implementation. Make sure the plugin is named as `userservice`. 

## Template Rendering

A Web system usually needs to dynamically render template to page. We also set some rules for API of template rendering:

- ctx.render(name, locals) - render template file, and assign value for `ctx.body`
- ctx.renderString(tpl, locals) - render template string. Not assign value, only return value.
- app.view - instance of View class constructed by Egg

Common Implementation:

- Egg has already set two interfaces: `ctx.render` and `ctx.renderString`.
- Other framework should provide specific View class and implementation of these two interfaces.
- Template engine is not restricted. Feel free to use as you wish.

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
