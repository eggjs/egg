---
title: Loader
order: 1
---

The most importance of Egg which enhanced Koa is that it is based on a certain agreement, code will be placed in different directories according to the functional differences, it significantly reduces development costs. Loader supports this set of conventions and abstracts that many low-level APIs could be extended.

## Application, Framework and Plugin

Egg is a low-level framework, applications could use it directly, but Egg only has a few default plugins, we need to configure plugins to extend features in application, such as MySQL.

```js
// application configuration
// package.json
{
  "dependencies": {
    "egg": "^2.0.0",
    "egg-mysql": "^3.0.0"
  }
}

// config/plugin.js
module.exports = {
  mysql: {
    enable: true,
    package: 'egg-mysql',
  },
}
```

With the increasing number of applications, we find most of them have similar configurations, so we could extend a new framework based on Egg, which makes application configurations simpler.

```js
// framework configuration
// package.json
{
  "name": "framework1",
  "version": "1.0.0",
  "dependencies": {
    "egg-mysql": "^3.0.0",
    "egg-view-nunjucks": "^2.0.0"
  }
}

// config/plugin.js
module.exports = {
  mysql: {
    enable: false,
    package: 'egg-mysql',
  },
  view: {
    enable: false,
    package: 'egg-view-nunjucks',
  }
}

// application configuration
// package.json
{
  "dependencies": {
    "framework1": "^1.0.0",
  }
}

// config/plugin.js
module.exports = {
  // enable plugins
  mysql: true,
  view: true,
}
```

From the scene above we can see the relationship of application, plugin and framework.

- We implement business logics in application, and specify a framework to run, so we could configure plugin to meet a special scene feature (such as MySQL).
- Plugin only performs specific function, when two separate functions are interdependent, they still need to be separated into two plugins, and requires configuration.
- Framework is a launcher (default is Egg), which is indispensable to run. Framework is also a wrapper, it aggregates plugins to provide functions unitedly, and it can also configure plugins.
- We can extend a new framework based on framework, which means that **framework can be inherited infinitely**, like class inheritance.

```
+-----------------------------------+--------+
|      app1, app2, app3, app4       |        |
+-----+--------------+--------------+        |
|     |              |  framework3  |        |
+     |  framework1  +--------------+ plugin |
|     |              |  framework2  |        |
+     +--------------+--------------+        |
|                   Egg             |        |
+-----------------------------------+--------|
|                   Koa                      |
+-----------------------------------+--------+
```

## LoadUnit

Egg regards application, framework and plugin as loadUnit, because they are similar in code structure, here is the directory structure:

```
loadUnit
├── package.json
├── app.js
├── agent.js
├── app
│   ├── extend
│   |   ├── helper.js
│   |   ├── request.js
│   |   ├── response.js
│   |   ├── context.js
│   |   ├── application.js
│   |   └── agent.js
│   ├── service
│   ├── middleware
│   └── router.js
└── config
    ├── config.default.js
    ├── config.prod.js
    ├── config.test.js
    ├── config.local.js
    └── config.unittest.js
```

However, there are still some differences:

| File                   | Application | Framework | Plugin |
| ---------------------- | ----------- | --------- | ------ |
| app/router.js          | ✔︎          |           |
| app/controller         | ✔︎          |           |
| app/middleware         | ✔︎          | ✔︎        | ✔︎     |
| app/service            | ✔︎          | ✔︎        | ✔︎     |
| app/extend             | ✔︎          | ✔︎        | ✔︎     |
| app.js                 | ✔︎          | ✔︎        | ✔︎     |
| agent.js               | ✔︎          | ✔︎        | ✔︎     |
| config/config.{env}.js | ✔︎          | ✔︎        | ✔︎     |
| config/plugin.js       | ✔︎          | ✔︎        |
| package.json           | ✔︎          | ✔︎        | ✔︎     |

During the loading process, Egg will traverse all loadUnits to load the files above(application, framework and plugin are different), the loading process has priority.

- Load according to `Plugin => Framework => Application`.
- The order of loading plugin depends on the dependencies, dependent plugins will be loaded first, independent plugins are loaded by the object key configuration order, see [Plugin](./plugin.md) for details.
- Frameworks are loaded by the order of inheritance, the lower the more priority.

For example, an application is configured with the following dependencies:

```
app
| ├── plugin2 (depends plugin3)
| └── plugin3
└── framework1
    | └── plugin1
    └── egg
```

The final loading order is:

```
=> plugin1
=> plugin3
=> plugin2
=> egg
=> framework1
=> app
```

The plugin1 is framework1's dependent plugin, the object key order of plugin1 after configuration merger is prior to plugin2/plugin3. Because of the dependencies between plugin2 and plugin3, the order is swapped. The framework1 inherits the Egg, so the order is after the egg. The application is the last to be loaded.

See [Loader.getLoadUnits](https://github.com/eggjs/egg-core/blob/65ea778a4f2156a9cebd3951dac12c4f9455e636/lib/loader/egg_loader.js#L233) method for details.

### File Order

The files that will be loaded by default are listed above. Egg will load files by the following order, each file or directory will be loaded according to loadUnit order (application, framework and plugin are different):

- Loading [plugin](./plugin.md), find application and framework, loading `config/plugin.js`
- Loading [config](../basics/config.md), traverse loadUnit to load `config/config.{env}.js`
- Loading [extend](../basics/extend.md), traverse loadUnit to load `app/extend/xx.js`
- [Application startup configuration](../basics/app-start.md), traverse loadUnit to load `app.js` and `agent.js`
- Loading [service](../basics/service.md), traverse loadUnit to load `app/service` directory
- Loading [middleware](../basics/middleware.md), traverse loadUnit to load `app/middleware` directory
- Loading [controller](../basics/controller.md), loading application's `app/controller` directory
- Loading [router](../basics/router.md), loading application's `app/router.js`

Note:

- Same name will be override in loading, for example, if we want to override `ctx.ip` we could define ip in application's `app/extend/context.js` directly.
- See [framework development](./framework.md) for detail application launch order.

### Life Cycles

The framework has provided you several functions to handle during the whole life cycle:

- `configWillLoad`: All the config files are ready to load, so this is the LAST chance to modify them.
- `configDidLoad`: When all the config files have been loaded.
- `didLoad`: When all the files have been loaded.
- `willReady`: When all the plugins are ready.
- `didReady`: When all the workers are ready.
- `serverDidReady`: When the server is ready.
- `beforeClose`: Before the application is closed.

Here're the definations:

```js
// app.js or agent.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  configWillLoad() {
    // Ready to call configDidLoad,
    // Config, plugin files are referred,
    // this is the last chance to modify the config.
  }

  configDidLoad() {
    // Config, plugin files have been loaded.
  }

  async didLoad() {
    // All files have loaded, start plugin here.
  }

  async willReady() {
    // All plugins have started, can do some thing before app ready
  }

  async didReady() {
    // Worker is ready, can do some things
    // don't need to block the app boot.
  }

  async serverDidReady() {
    // Server is listening.
  }

  async beforeClose() {
    // Do some thing before app close.
  }
}

module.exports = AppBootHook;
```

The framework will automatically load and initialize this class after developers have defined `app.js` and `agenet.js` in the form of class, and it will call the corresponding methods during each of the life cycles.

Here's the image of starting process:

![](https://user-images.githubusercontent.com/40081831/50559449-2d3cdc80-0d32-11e9-96f2-42b3cc56d5d3.png)

**Notice: We have an expiring time limitation when using `beforeClose` to close the processing of the framework. If a worker has accepted the signal of exit but doesn't exit within the limit period, it will be FORCELY closed.**

If you need to modify the expiring time, please see [this document](https://github.com/eggjs/egg-cluster).

Deprecated methods:

## `beforeStart`

`beforeStart` is called during the loading process, all of its methods are running in parallel. So we usually execute some asynchronized methods (e.g: Check the state of connection, in [`egg-mysql`](https://github.com/eggjs/egg-mysql/blob/master/lib/mysql.js) we use this method to check the connection state with mysql). When all the tasks in `beforeStart` finished, the state will be `ready`. It's NOT recommended to excute a function that consumes too much time there, which will cause the expiration of application's start.plugin developers should use `didLoad` instead, for application developers, `willReady` is the replacer.

## `ready`

All the methods mounted on `ready` will be executed when load ends, and after all the methods in `beforeStart` have finished executing. By the time Http server's listening also starts. This means all the plugins are fully loaded and everything is ready, So we use it to process some tasks after start. For developers now, we use `didReady` instead.

## `beforeClose`

All the methods mounted on `beforeClose` are called in an inverted order after `close` method in app/agent instance is called. E.g: in [`egg`](https://github.com/eggjs/egg/blob/master/lib/egg.js), we close logger, remove listening methods ...,ect.Developers SHOULDN'T use `app.beforeClose` directly now, but in the form of class to implement `beforeClose` instead.

**We don't recommend to use this function in a PROD env, because the process may end before it finishes.**

What's more, we can use [`egg-development`](https://github.com/eggjs/egg-development#loader-trace) to see the loading process.

### File-Loading Rules

The framework will convert file names when loading files, because there is a difference between the file naming style and the API style. We recommend that files use underscores, while APIs use lower camel case. For examplem `app/service/user_info.js` will be converted to `app.service.userInfo`.

The framework also supports hyphens and camel case:

- `app/service/user-info.js` => `app.service.userInfo`
- `app/service/userInfo.js` => `app.service.userInfo`

Loader also provides [caseStyle](#caseStyle-string) to force the first letter case, such as make the first letter of the API upper case when loading the model, `app/model/user.js` => `app.model.User`, we can set `caseStyle: 'upper'`.

## Extend Loader

[Loader] is a base class and provides some built-in methods based on the rules of the file loading, but itself does not call them in most cases, inherited classes call those methods.

- loadPlugin()
- loadConfig()
- loadAgentExtend()
- loadApplicationExtend()
- loadRequestExtend()
- loadResponseExtend()
- loadContextExtend()
- loadHelperExtend()
- loadCustomAgent()
- loadCustomApp()
- loadService()
- loadMiddleware()
- loadController()
- loadRouter()

Egg implements [AppWorkerLoader] and [AgentWorkerLoader] based on the Loader, inherited frameworks could make extensions based on these two classes, and **Extensions of the Loader can only be done in the framework**.

```js
// custom AppWorkerLoader
// lib/framework.js
const path = require('path');
const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');

class YadanAppWorkerLoader extends egg.AppWorkerLoader {
  constructor(opt) {
    super(opt);
    // custom initialization
  }

  loadConfig() {
    super.loadConfig();
    // process config
  }

  load() {
    super.load();
    // custom loading other directories
    // or processing loaded files
  }
}

class Application extends egg.Application {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
  // override Egg's Loader, use this Loader when launching
  get [EGG_LOADER]() {
    return YadanAppWorkerLoader;
  }
}

module.exports = Object.assign(egg, {
  Application,
  // custom Loader also need export, inherited framework make extensions based on it
  AppWorkerLoader: YadanAppWorkerLoader,
});
```

It's convenient for development team to customize loading via the Loader supported APIs. such as `this.model.xx`, `app/extend/filter.js` and so on.

The mention above is just a description of the Loader wording, please see [Framework Development](./framework.md) for details.

## Loader API

Loader also supports some low level APIs to simplify code when extending, [here](https://github.com/eggjs/egg-core#eggloader) are all APIs.

### `loadFile`

Used to load a file, such as loading `app/xx.js`:

```js
// app/xx.js
module.exports = (app) => {
  console.log(app.config);
};

// app.js
// app/xx.js, as an example, we could load this file in app.js
const path = require('path');
module.exports = (app) => {
  app.loader.loadFile(path.join(app.config.baseDir, 'app/xx.js'));
};
```

If the file exports a function, then the function will be called with `app` as its parameter, otherwise uses this value directly.

### `loadToApp`

Used to load files from a directory into the app, such as `app/controller/home.js` to `app.controller.home`.

```js
// app.js
// The following is just an example, using loadController to load controller in practice
module.exports = (app) => {
  const directory = path.join(app.config.baseDir, 'app/controller');
  app.loader.loadToApp(directory, 'controller');
};
```

The method has three parameters `loadToApp(directory, property, LoaderOptions)`:

1. Directory could be String or Array, Loader will load files in those directories.
2. Property is app's property.
3. [LoaderOptions](#LoaderOptions) are some configurations.

### `loadToContext`

The difference between loadToApp and loadToContext is that loadToContext loads files into ctx instead of app, and it's a lazy loading. It puts files into a temp object when loading, and instantiates objects when calling ctx APIs.

We load service in this mode as an example:

```js
// The following is just an example, using loadService in practice
// app/service/user.js
const Service = require('egg').Service;
class UserService extends Service {}
module.exports = UserService;

// app.js
// get all loadUnit
const servicePaths = app.loader
  .getLoadUnits()
  .map((unit) => path.join(unit.path, 'app/service'));

app.loader.loadToContext(servicePaths, 'service', {
  // service needs to inherit app.Service, so needs app as parameter
  // enable call will return UserService when loading
  call: true,
  // loading file into app.serviceClasses
  fieldClass: 'serviceClasses',
});
```

`app.serviceClasses.user` becomes UserService after file loading, it instantiates UserService when calling `ctx.service.user`.
So this class will only be instantiated when first calling, and will be cached after instantiation, multiple calling same request will be instantiated only once.

### LoaderOptions

#### `ignore [String]`

`ignore` could ignore some files, supports glob, the default is empty.

```js
app.loader.loadToApp(directory, 'controller', {
  // ignore files in app/controller/util
  ignore: 'util/**',
});
```

#### `initializer [Function]`

Processing each file exported values, the default is empty.

```js
// app/model/user.js
module.exports = class User {
  constructor(app, path) {}
};

// Loading from app/model, could do some initializations when loading.
const directory = path.join(app.config.baseDir, 'app/model');
app.loader.loadToApp(directory, 'model', {
  initializer(model, opt) {
    // The first parameter is export's object
    // The second parameter is an object that only contains current file path.
    return new model(app, opt.path);
  },
});
```

#### `caseStyle [String]`

File conversion rules, could be `camel`, `upper`, `lower`, the default is `camel`.

All three convert file name to camel case, but deal with the initials differently:

- `camel`: initials unchanged.
- `upper`: initials upper case.
- `lower`: initials lower case.

Loading different files uses different configurations:

| File           | Configuration |
| -------------- | ------------- |
| app/controller | lower         |
| app/middleware | lower         |
| app/service    | lower         |

#### `override [Boolean]`

Overriding or throwing exception when encounter existing files, the default is false.

For example, the `app/service/user.js` is both loaded by the application and the plugin, if the setting is true, the application will override the plugin, otherwise an error will be throwed when loading.

Loading different files uses different configurations:

| File           | Configuration |
| -------------- | ------------- |
| app/controller | true          |
| app/middleware | false         |
| app/service    | false         |

#### `call [Boolean]`

Calling when export's object is function, and get the return value, the default is true

Loading different files uses different configurations:

| File           | Configuration |
| -------------- | ------------- |
| app/controller | true          |
| app/middleware | false         |
| app/service    | true          |

## CustomLoader

You can use `customLoader` instead of `loadToContext` and `loadToApp`.

When you define a loader with `loadToApp`

```js
// app.js
module.exports = (app) => {
  const directory = path.join(app.config.baseDir, 'app/adapter');
  app.loader.loadToApp(directory, 'adapter');
};
```

Instead, you can define `customLoader`

```js
// config/config.default.js
module.exports = {
  customLoader: {
    // the property name when load to application, E.X. app.adapter
    adapter: {
      // relative to app.config.baseDir
      directory: 'app/adapter',
      // if inject is ctx, it will use loadToContext
      inject: 'app',
      // whether load the directory of the framework and plugin
      loadunit: false,
      // you can also use other LoaderOptions
   }
  },
};
``

[Loader]: https://github.com/eggjs/egg-core/blob/master/lib/loader/egg_loader.js
[AppWorkerLoader]: https://github.com/eggjs/egg/blob/master/lib/loader/app_worker_loader.js
[AgentWorkerLoader]: https://github.com/eggjs/egg/blob/master/lib/loader/agent_worker_loader.js
```
