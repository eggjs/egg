title: Loader
---

The most important of Egg enhance Koa is Egg based on a certain agreement, code will be placed in different directories according to the functional differences, it significantly reduce development costs. Loader supports this set of conventions and abstracts that many low-level APIs could be extended.

## Application, Framework and Plugin

Egg is a low-level framework, applications could use it directly, but Egg only has a little default plugins, applications need to configure plugins to extend features, such as MySQL.

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

With the increase number of applications, we find most of them have similar configurations, then we could extend a new framework based on Egg, which make the application configuration simpler.

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

From the above scene we can see the relationship of application, plugin and framework.

- We implement business logics in application, we need to specify a framework to run, we could configure plugin to meet a special scene feature (such as MySQL).
- Plugin only performs specific function, when two separate functions are interdependent, they still need to be separated into two plugins, and requires configuration.
- Framework is a launcher (default is Egg), which is indispensable to run. Framework is also a wrapper, it aggregates plugins to provide functions unitedly, framework can also configure plugins.
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

## loadUnit

Egg regard application, framework and plugin as loadUnit, because they are similar in code structure, here is the directory structure

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

However, there are still some differences

File | Application | Framework | Plugin
--- | --- | --- | ---
app/router.js | ✔︎ | |
app/controller | ✔︎ | |
app/middleware | ✔︎ | ✔︎ | ✔︎
app/service | ✔︎ | ✔︎ | ✔︎
app/extend | ✔︎ | ✔︎ | ✔︎
app.js | ✔︎ | ✔︎ | ✔︎
agent.js | ✔︎ | ✔︎ | ✔︎
config/config.{env}.js | ✔︎ | ✔︎ | ✔︎
config/plugin.js | ✔︎ | ✔︎ |
package.json | ✔︎ | ✔︎ | ✔︎

During the loading process, Egg will traverse all loadUnits to load the above files (application, framework and plugin are different), the loading process has priority.

- follow the order Plugin => Framework => Application to load
- The order of loading plugins depends on the dependencies, depended plugins will be loaded first, no dependencies plugins are loaded by the object key configuration order, see [Plugin](./plugin.md) for details.
- Frameworks are loaded by the order of inheritance, the lower the more priority.

For example, an application is configured with the following dependencies

```
app
| ├── plugin2 (depends plugin3)
| └── plugin3
└── framework1
    | └── plugin1
    └── egg
```

The final loading order is

```
=> plugin1
=> plugin3
=> plugin2
=> egg
=> framework1
=> app
```

The plugin1 is framework1 depended plugin, the object key order of plugin1 after configuration merger is prior to plugin2/plugin3. Because of the dependencies between plugin2 and plugin3, the order is swapped. The framework1 inherits the Egg, so the order it after the egg. The application is the last to be loaded.

See [Loader.getLoadUnits](https://github.com/eggjs/egg-core/blob/65ea778a4f2156a9cebd3951dac12c4f9455e636/lib/loader/egg_loader.js#L233) method for details.

### File order

The above lists default loading files, Egg will load files by the following order, each file or directory will be loaded according to loadUnit order (application, framework and plugin are different).

- Loading [plugin](./plugin.md), find application and framework, loading `config/plugin.js`
- Loading [config](../basics/config.md), traverse loadUnit to load `config/config.{env}.js`
- Loading [extend](../basics/extend.md), traverse loadUnit to load `app/extend/xx.js`
- [Application startup configuration](../basics/app-start.md), traverse loadUnit to load `app.js` and `agent.js`
- Loading [service](../basics/service.md), traverse loadUnit to load `app/service` directory
- Loading [middleware](../basics/middleware.md), traverse loadUnit to load `app/middleware` directory
- Loading [controller](../basics/controller.md), loading application's `app/controller` directory
- Loading [router](../basics/router.md), loading application's `app/router.js`

Note

- Same name will be override in loading, for example, if we want to override `ctx.ip` we could define ip in application's `app/extend/context.js` directly.
- See [framework development](./framework.md) for detail application launch order.

### Loading File rules

The framework will convert file names when loading files, because there is a difference between the file naming style and the API style. We recommend that files use underscores, while APIs use lower camel case. For examplem `app/service/user_info.js` will be converted to `app.service.userInfo`.

The framework also supports hyphens and camel case.

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

The above is just a description of the Loader wording, see [Framework Development](./framework.md) for details.

## Loader API

Loader also supports some low level APIs to simplify code when extending, [here](https://github.com/eggjs/egg-core#eggloader) are all APIs.

### loadFile

Used to load a file, such as loading `app.js` is using this method.

```js
// app/xx.js
module.exports = app => {
  console.log(app.config);
};

// app.js
// app/xx.js, as an example, we could load this file in app.js
const path = require('path');
module.exports = app => {
  app.loader.loadFile(path.join(app.config.baseDir, 'app/xx.js'));
};
```

If the file export a function, then the function will be called with app as a parameter, otherwise using this value directly.

### loadToApp

Used to load files from a directory into the app, such as `app/controller/home.js` to `app.controller.home`.

```js
// app.js
// The following is just an example, using loadController to load controller in practice
module.exports = app => {
  const directory = path.join(app.config.baseDir, 'app/controller');
  app.loader.loadToApp(directory, 'controller');
};
```

The method has three parameters `loadToApp(directory, property, LoaderOptions)`

1. directory could be String or Array, Loader will load files in those directories.
1. property is app's property.
1. [LoaderOptions](#LoaderOptions) are some configurations.

### loadToContext

The difference between loadToApp and loadToContext is that loadToContext loading files into ctx instead of app, and it is lazy loading. Putting files into a temp object when loading, and instantiate object when calling ctx API.

For example, service loading is this mode

```js
// The following is just an example, using loadService in practice
// app/service/user.js
const Service = require('egg').Service;
class UserService extends Service {

}
module.exports = UserService;

// app.js
// get all loadUnit
const servicePaths = app.loader.getLoadUnits().map(unit => path.join(unit.path, 'app/service'));

app.loader.loadToContext(servicePaths, 'service', {
  // service needs to inherit app.Service, so needs app as parameter
  // enable call will return UserService when loading
  call: true,
  // loading file into app.serviceClasses
  fieldClass: 'serviceClasses',
});
```

`app.serviceClasses.user` becomes UserService after file loading, instantiating UserService when calling `ctx.service.user`.
So this class will only be instantiated when first calling, and will be cached after instantiation, multiple calling same request will only instantiating once.

### LoaderOptions

#### ignore [String]

ignore could ignore some files, supports glob, the default is empty

```js
app.loader.loadToApp(directory, 'controller', {
  // ignore files in app/controller/util
  ignore: 'util/**',
});
```

#### initializer [Function]

Processing each file exported values, the default is empty. 

```js
// app/model/user.js
module.exports = class User {
  constructor(app, path) {}
}

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

#### caseStyle [String]

File conversion rules, could be `camel`, `upper`, `lower`, the default is `camel`.

All three convert file name to camel case, but deal with the initials differently.

- `camel`: initials unchanged.
- `upper`: initials upper case.
- `lower`: initials lower case.

Loading different files using different configurations.

File | Configuration
--- | ---
app/controller | lower
app/middleware | lower
app/service | lower

#### override [Boolean]

Overriding or throwing exception when encounter existing files, the default is false

For example, the `app/service/user.js` is both loaded by the application and the plugin, if the setting is true, the application will override the plugin, otherwise an error will be throwed when loading.

Loading different files using different configurations.

File | Configuration
--- | ---
app/controller | true
app/middleware | false
app/service | false

#### call [Boolean]

Calling when export's object is function, and get the return value, the default is true 

Loading different files using different configurations.

File | Configuration
--- | ---
app/controller | true
app/middleware | false
app/service | true

[Loader]: https://github.com/eggjs/egg-core/blob/master/lib/loader/egg_loader.js
[AppWorkerLoader]: https://github.com/eggjs/egg/blob/master/lib/loader/app_worker_loader.js
[AgentWorkerLoader]: https://github.com/eggjs/egg/blob/master/lib/loader/agent_worker_loader.js
