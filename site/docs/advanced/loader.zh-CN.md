---
title: 加载器（Loader）
order: 1
---

Egg 在 Koa 的基础上进行增强，最重要的就是基于一定的约定，将功能不同的代码分类放置到不同的目录下管理，这对整体团队的开发成本提升有着明显的效果。Loader 实现了这套约定，并且抽象了很多底层 API，以便于进一步扩展。

## 应用、框架和插件

Egg 是一个底层框架，应用可以直接使用，但 Egg 本身的插件比较少。因此，应用需要自己配置插件来增加各种特性，比如 MySQL。

```js
// 应用配置
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
    package: 'egg-mysql'
  }
}
```

当应用数量达到一定规模时，会发现大部分应用的配置都相似。这时，可以基于 Egg 扩展出一个框架，进而简化应用的配置。

```js
// 框架配置
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
    package: 'egg-mysql'
  },
  view: {
    enable: false,
    package: 'egg-view-nunjucks'
  }
}

// 应用配置
// package.json
{
  "dependencies": {
    "framework1": "^1.0.0"
  }
}

// config/plugin.js
module.exports = {
  // 开启插件
  mysql: true,
  view: true
}
```

从上面的使用场景可以看出应用、插件和框架三者之间的关系。

- 在应用中完成业务，需要指定框架才能运行。当应用需要某一特定功能时，可以通过配置插件来获得，例如 MySQL。
- 插件专注于完成特定的功能。如果两个独立功能之间存在依赖，可以分成两个插件，但需要相互配置依赖。
- 框架是一个启动器（默认是 Egg），有了框架应用才能运行。框架还起到封装器的作用，将多个插件的功能聚合起来统一提供，并且框架也可以配置插件。
- 在框架的基础上还可以扩展新的框架，也就是说，框架可以无限级继承，这有点类似于类的继承。

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
## 加载单元（loadUnit）

Egg 将应用、框架和插件都称为加载单元（loadUnit），因为在代码结构上几乎没有什么差异。下面是一种典型的目录结构：

```
loadUnit
├── package.json
├── app.js
├── agent.js
├── app
│   ├── extend
│   │   ├── helper.js
│   │   ├── request.js
│   │   ├── response.js
│   │   ├── context.js
│   │   ├── application.js
│   │   └── agent.js
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

不过，还存在一些差异，如下表所示：

| 文件                      | 应用 | 框架 | 插件 |
| ------------------------- | ---- | ---- | ---- |
| package.json              | ✔    | ✔    | ✔    |
| config/plugin.{env}.js    | ✔    | ✔    |      |
| config/config.{env}.js    | ✔    | ✔    | ✔    |
| app/extend/application.js | ✔    | ✔    | ✔    |
| app/extend/request.js     | ✔    | ✔    | ✔    |
| app/extend/response.js    | ✔    | ✔    | ✔    |
| app/extend/context.js     | ✔    | ✔    | ✔    |
| app/extend/helper.js      | ✔    | ✔    | ✔    |
| agent.js                  | ✔    | ✔    | ✔    |
| app.js                    | ✔    | ✔    | ✔    |
| app/service               | ✔    | ✔    | ✔    |
| app/middleware            | ✔    | ✔    | ✔    |
| app/controller            | ✔    |      |      |
| app/router.js             | ✔    |      |      |

文件按表格内的顺序从上到下加载。

在加载过程中，Egg 会遍历所有的 loadUnit 加载上述的文件（应用、框架、插件各有不同），加载时有一定的优先级：

- 按插件 => 框架 => 应用的顺序依次加载。
- 插件之间的顺序由依赖关系决定，被依赖方先加载，无依赖者按 object key 的配置顺序加载。具体可以查看[插件章节](./plugin.md)。
- 框架按继承顺序加载，越底层越先加载。

例如，有这样一个应用配置了如下依赖：

```
app
| ├── plugin2 （依赖 plugin3）
| └── plugin3
└── framework1
    | └── plugin1
    └── egg
```

最终的加载顺序为：

```
=> plugin1
=> plugin3
=> plugin2
=> egg
=> framework1
=> app
```

plugin1 是 framework1 依赖的插件。由于 plugin2 和 plugin3 的依赖关系，因此交换了它们的位置。由于 framework1 继承了 egg，因此它的加载顺序会晚于 egg。应用将最后加载。

更多信息请查看 [Loader.getLoadUnits](https://github.com/eggjs/egg-core/blob/65ea778a4f2156a9cebd3951dac12c4f9455e636/lib/loader/egg_loader.js#L233) 方法。

### 文件顺序

上文已经列出了默认会加载的文件。Egg 会按照如下文件顺序进行加载，每个文件或目录再根据 loadUnit 的顺序去加载（应用、框架、插件各有不同）：

1. 加载 [plugin](./plugin.md)，找到应用和框架，加载 `config/plugin.js`。
2. 加载 [config](../basics/config.md)，遍历 loadUnit 加载 `config/config.{env}.js`。
3. 加载 [extend](../basics/extend.md)，遍历 loadUnit 加载 `app/extend/xx.js`。
4. [自定义初始化](../basics/app-start.md)，遍历 loadUnit 加载 `app.js` 和 `agent.js`。
5. 加载 [service](../basics/service.md)，遍历 loadUnit 加载 `app/service` 目录。
6. 加载 [middleware](../basics/middleware.md)，遍历 loadUnit 加载 `app/middleware` 目录。
7. 加载 [controller](../basics/controller.md)，加载应用的 `app/controller` 目录。
8. 加载 [router](../basics/router.md)，加载应用的 `app/router.js`。

请注意：

- 加载时如果遇到同名文件将会被覆盖。比如，如果想要覆盖 `ctx.ip`，可以在应用的 `app/extend/context.js` 中直接定义 `ip`。
- 应用完整启动顺序请查看[框架开发](./framework.md)。
### 生命周期

框架提供了以下生命周期函数供开发者使用：

- 配置文件即将加载，为修改配置的最后机会（`configWillLoad`）
- 配置文件已加载完成（`configDidLoad`）
- 文件已加载完成（`didLoad`）
- 插件启动完毕（`willReady`）
- worker 准备就绪（`didReady`）
- 应用启动完成（`serverDidReady`）
- 应用即将关闭（`beforeClose`）

定义方法如下：

```js
// app.js 或 agent.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  configWillLoad() {
    // 准备调用 configDidLoad，
    // 配置文件和插件文件将被引用，
    // 这是修改配置的最后机会。
  }

  configDidLoad() {
    // 配置文件和插件文件已被加载。
  }

  async didLoad() {
    // 所有文件已加载，这里开始启动插件。
  }

  async willReady() {
    // 所有插件已启动，在应用准备就绪前可执行一些操作。
  }

  async didReady() {
    // worker 已准备就绪，在这里可以执行一些操作，
    // 这些操作不会阻塞应用启动。
  }

  async serverDidReady() {
    // 服务器已开始监听。
  }

  async beforeClose() {
    // 应用关闭前执行一些操作。
  }
}

module.exports = AppBootHook;
```

开发者使用类的方式定义 `app.js` 和 `agent.js` 后，框架将自动加载并实例化这个类，并在各个生命周期阶段调用相应的方法。

启动过程如图所示：

![](https://user-images.githubusercontent.com/40081831/47344271-a688d500-d6da-11e8-96e9-663fa9f45108.png)

**在使用 `beforeClose` 时，需要注意：框架在处理关闭进程时设有超时限制。如果 worker 进程在收到退出信号后，未能在规定时间内退出，则会被强制终止。**

如需调整超时时间，请查阅[相关文档](https://github.com/eggjs/egg-cluster)。

弃用的方法：

## beforeStart

`beforeStart` 方法在加载过程中调用，所有方法并行执行。通常用于执行一些异步任务，例如检查连接状态等。例如，[`egg-mysql`](https://github.com/eggjs/egg-mysql/blob/master/lib/mysql.js) 使用 `beforeStart` 来检查 MySQL 的连接状态。所有 `beforeStart` 任务结束后，应用将进入 `ready` 状态。不建议执行耗时长的方法，可能导致应用启动超时。插件开发者应使用 `didLoad` 替代，应用开发者应使用 `willReady` 替代。

## ready

注册到 `ready` 方法的任务将在加载结束后，所有 `beforeStart` 方法执行完毕后顺序执行，HTTP 服务器监听也在此时开始。此时代表所有插件已加载完成且准备工作已完成，通常用于执行一些启动后置任务。开发者应使用 `didReady` 替代。

## beforeClose

`beforeClose` 注册方法在 app/agent 实例的 `close` 方法调用后，按注册的逆序执行。通常用于资源释放操作，例如 [`egg`](https://github.com/eggjs/egg/blob/master/lib/egg.js) 用于关闭日志、移除监听器等。开发者不应直接使用 `app.beforeClose`，而是通过定义类的形式，实现 `beforeClose` 方法。

**此方法不建议在生产环境使用，因可能会出现未完全执行结束就结束进程的情况。**

另外，我们可以使用 [`egg-development`](https://github.com/eggjs/egg-development#loader-trace) 来查看加载过程。

### 文件加载规则

框架在加载文件时会进行转换，因为文件命名风格与 API 风格有所差异。我们推荐文件使用下划线命名，而 API 使用驼峰命名。例如 `app/service/user_info.js` 会转换为 `app.service.userInfo`。

框架也支持其它风格命名的文件；连字符和驼峰方式命名的文件同样支持：

- `app/service/user-info.js` => `app.service.userInfo`
- `app/service/userInfo.js` => `app.service.userInfo`

Loader 也提供了 [caseStyle](#caseStyle-string) 设置来强制指定命名方式，如将 model 加载时的 API 首字母大写，`app/model/user.js` => `app.model.User`，可指定 `caseStyle: 'upper'`。
## 扩展 Loader

`Loader` 是一个基类，并根据文件加载的规则提供了一些内置的方法。它本身并不会去调用这些方法，而是由继承类调用。

- `loadPlugin()`
- `loadConfig()`
- `loadAgentExtend()`
- `loadApplicationExtend()`
- `loadRequestExtend()`
- `loadResponseExtend()`
- `loadContextExtend()`
- `loadHelperExtend()`
- `loadCustomAgent()`
- `loadCustomApp()`
- `loadService()`
- `loadMiddleware()`
- `loadController()`
- `loadRouter()`

`Egg` 基于 `Loader` 实现了 `AppWorkerLoader` 和 `AgentWorkerLoader`，上层框架基于这两个类来扩展。**Loader 的扩展只能在框架进行**。

```js
// 自定义 AppWorkerLoader
// lib/framework.js
const path = require('path');
const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');

class YadanAppWorkerLoader extends egg.AppWorkerLoader {
  constructor(opt) {
    super(opt);
    // 自定义初始化
  }

  loadConfig() {
    super.loadConfig();
    // 对 config 进行处理
  }

  load() {
    super.load();
    // 自定义加载其他目录
    // 或对已加载的文件进行处理
  }
}

class Application extends egg.Application {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
  // 覆盖 Egg 的 Loader，启动时使用这个 Loader
  get [EGG_LOADER]() {
    return YadanAppWorkerLoader;
  }
}

module.exports = Object.assign(egg, {
  Application,
  // 自定义的 Loader 也需要 export，上层框架需要基于这个扩展
  AppWorkerLoader: YadanAppWorkerLoader,
});
```

通过 `Loader` 提供的这些 API，可以很方便地定制团队的自定义加载，例如 `this.model.xx`，`app/extend/filter.js` 等等。

以上只是说明 `Loader` 的写法，具体可以查看[框架开发](./framework.md)。
## 加载器函数（Loader API）

Loader 提供了一些基础 API，方便在扩展时简化代码。想了解所有相关 API，请[点击此处](https://github.com/eggjs/egg-core#eggloader)。

### loadFile

此函数用来加载文件，例如加载 `app/xx.js` 就会用到它。

```js
// app/xx.js
module.exports = (app) => {
  console.log(app.config);
};

// app.js
// 以 app/xx.js 为例子，在 app.js 中加载此文件：
const path = require('path');
module.exports = (app) => {
  app.loader.loadFile(path.join(app.config.baseDir, 'app/xx.js'));
};
```

如果文件导出了一个函数，这个函数会被调用，`app` 作为参数传入；如果不是函数，则直接使用文件导出的值。

### loadToApp

此函数用来将一个目录下的文件加载到 app 对象上，例如 `app/controller/home.js` 会被加载到 `app.controller.home`。

```js
// app.js
// 以下只是示例，加载 controller 请用 loadController
module.exports = (app) => {
  const directory = path.join(app.config.baseDir, 'app/controller');
  app.loader.loadToApp(directory, 'controller');
};
```

`loadToApp` 有三个参数：`loadToApp(directory, property, LoaderOptions)`

1. `directory` 可以是字符串或数组。Loader 会从这些目录中加载文件。
2. `property` 是 app 的属性名。
3. [`LoaderOptions`](#LoaderOptions) 包含了一些配置选项。

### loadToContext

`loadToContext` 与 `loadToApp` 略有不同，它是将文件加载到 `ctx` 上，而不是 `app`，并且支持懒加载。加载操作会将文件放到一个临时对象中，在调用 `ctx` API 时才去实例化。

例如，加载 service 文件的方式就用到了这种模式：

```js
// 以下为示例，请使用 loadService
// app/service/user.js
const Service = require('egg').Service;
class UserService extends Service {}
module.exports = UserService;

// app.js
// 获取所有的 loadUnit
const servicePaths = app.loader
  .getLoadUnits()
  .map((unit) => path.join(unit.path, 'app/service'));

app.loader.loadToContext(servicePaths, 'service', {
  // service 需要继承 app.Service，因此需要 app 参数
  // 设置 call 为 true，会在加载时调用函数，并返回 UserService
  call: true,
  // 将文件加载到 app.serviceClasses
  fieldClass: 'serviceClasses',
});
```

文件加载完成后，`app.serviceClasses.user` 就代表 UserService 类。当调用 `ctx.service.user` 时，会实例化 UserService 类。因此，这个类只有在每次请求中首次被访问时才会实例化。实例化后，对象会被缓存，同一个请求中多次调用也只实例化一次。
### LoaderOptions

#### ignore [String]

`ignore` 可用于忽略某些文件，支持 glob 匹配模式，默认值为空。

```js
app.loader.loadToApp(directory, 'controller', {
  // 忽略 app/controller/util 目录下的文件
  ignore: 'util/**',
});
```

#### initializer [Function]

对每个文件 export 的值进行处理，此项默认为空。

```js
// app/model/user.js
module.exports = class User {
  constructor(app, path) {}
};

// 从 app/model 目录加载，且可以在加载时进行一些初始化处理
const directory = path.join(app.config.baseDir, 'app/model');
app.loader.loadToApp(directory, 'model', {
  initializer(model, opt) {
    // 第一个参数为 export 的对象
    // 第二个参数为一个对象，里面包含当前文件的路径
    return new model(app, opt.path);
  },
});
```

#### caseStyle [String]

设置文件命名的转换规则，可选项为 `camel`、`upper` 或 `lower`，默认值为 `camel`。

这些选项都会将文件名转换为驼峰命名，但是首字符的大小写处理不同：
- `camel`：首字母保持不变。
- `upper`：首字母转为大写。
- `lower`：首字母转为小写。

根据不同文件类型设置相应的转换规则，如下表所示：

| 文件类型       | `caseStyle` 配置 |
| ------------- | -------------- |
| app/controller | lower          |
| app/middleware | lower          |
| app/service    | lower          |

#### override [Boolean]

当存在同名文件时，是否覆盖原有文件，或抛出异常。默认值为 `false`。

例如，当同时加载应用和插件中的 `app/service/user.js` 文件时：
- 若 `override` 设为 `true`，则应用中的文件会覆盖插件中的同名文件。
- 若设为 `false`，则在尝试加载应用中的文件时会报错。

根据不同文件类型设置 `override` 的配置值，如下表所示：

| 文件类型       | `override` 配置 |
| ------------- | --------------- |
| app/controller | true            |
| app/middleware | false           |
| app/service    | false           |

#### call [Boolean]

若 export 出的对象是函数，则可以调用此函数并获取其返回值，默认值为 `true`。

根据不同文件类型设置 `call` 的配置值，如下表所示：

| 文件类型       | `call` 配置   |
| ------------- | ------------- |
| app/controller | true          |
| app/middleware | false         |
| app/service    | true          |


## CustomLoader

`loadToContext` 和 `loadToApp` 方法可以通过 `customLoader` 的配置来替代。

以下是用 `loadToApp` 方法加载代码的示例：

```js
// app.js
module.exports = (app) => {
  const directory = path.join(app.config.baseDir, 'app/adapter');
  app.loader.loadToApp(directory, 'adapter');
};
```

改为使用 `customLoader` 后的写法是：

```js
// config/config.default.js
module.exports = {
  customLoader: {
    // 在 app 对象上定义的属性名为 app.adapter
    adapter: {
      // 路径相对于 app.config.baseDir
      directory: 'app/adapter',
      // 如果用于 ctx，则应该使用 loadToContext 方法
      inject: 'app',
      // 是否加载框架和插件的目录
      loadunit: false,
      // 也可以定义其他 LoaderOptions
    },
  },
};
```

参考链接：
- [loader]: https://github.com/eggjs/egg-core/blob/master/lib/loader/egg_loader.js
- [appworkerloader]: https://github.com/eggjs/egg/blob/master/lib/loader/app_worker_loader.js
- [agentworkerloader]: https://github.com/eggjs/egg/blob/master/lib/loader/agent_worker_loader.js