---
title: 插件开发
order: 2
---

插件机制是我们框架的一大特色。它不但可以保证框架核心的足够精简、稳定、高效，还可以促进业务逻辑的复用，生态圈的形成。有人可能会问:

- Koa 已经有了中间件的机制，为啥还要插件呢？
- 中间件、插件、应用它们之间是什么关系，有什么区别？
- 我该怎么使用一个插件？
- 如何编写一个插件？

在 [使用插件](../basics/plugin.md) 章节我们已经讨论过前几点，接下来我们来看看如何开发一个插件。

## 插件开发

### 使用脚手架快速开发

你可以直接使用 [egg-boilerplate-plugin] 脚手架来快速上手。

```bash
$ mkdir egg-hello && cd egg-hello
$ npm init egg --type=plugin
$ npm i
$ npm test
```

## 插件的目录结构

一个插件其实就是一个“迷你的应用”，下面展示的是一个插件的目录结构，和应用（app）几乎一样。

```plaintext
.egg-hello
├── package.json
├── app.js（可选）
├── agent.js（可选）
├── app
│   ├── extend（可选）
│   │   ├── helper.js（可选）
│   │   ├── request.js（可选）
│   │   ├── response.js（可选）
│   │   ├── context.js（可选）
│   │   ├── application.js（可选）
│   │   └── agent.js（可选）
│   ├── service（可选）
│   └── middleware（可选）
│       └── mw.js
├── config
│   ├── config.default.js
│   ├── config.prod.js
│   ├── config.test.js（可选）
│   ├── config.local.js（可选）
│   └── config.unittest.js（可选）
└── test
    └── middleware
        └── mw.test.js
```

那区别在哪儿呢？

1. 插件没有独立的 router 和 controller。这主要出于几点考虑：

   - 路由一般和应用强绑定的，不具备通用性。
   - 一个应用可能依赖很多个插件，如果插件支持路由可能会导致路由冲突。
   - 如果确实有统一路由的需求，可以考虑在插件里通过中间件来实现。

2. 插件需要在 `package.json` 中的 `eggPlugin` 节点指定插件特有的信息：

   - `{String} name` - 插件名（必须配置），具有唯一性，配置依赖关系时会指定依赖插件的 name。
   - `{Array} dependencies` - 当前插件强依赖的插件列表（如果依赖的插件没找到，应用启动失败）。
   - `{Array} optionalDependencies` - 当前插件的可选依赖插件列表（如果依赖的插件未开启，只会 warning，不会影响应用启动）。
   - `{Array} env` - 只有在指定运行环境才能开启，具体有哪些环境可以参考 [运行环境](../basics/env.md)。此配置是可选的，一般情况下都不需要配置。

     ```json
     {
       "name": "egg-rpc",
       "eggPlugin": {
         "name": "rpc",
         "dependencies": ["registry"],
         "optionalDependencies": ["vip"],
         "env": ["local", "test", "unittest", "prod"]
       }
     }
     ```

3. 插件没有 `plugin.js`：

   - `eggPlugin.dependencies` 只是用于声明依赖关系，而不是引入插件或开启插件。
   - 如果期望统一管理多个插件的开启和配置，可以在 [上层框架](./framework.md) 处理。

## 插件的依赖管理

和中间件不同，插件是自己管理依赖的。应用在加载所有插件前会预先从它们的 `package.json` 中读取 `eggPlugin > dependencies` 和 `eggPlugin > optionalDependencies` 节点，然后根据依赖关系计算出加载顺序，举个例子，下面三个插件的加载顺序就应该是 `c => b => a`。

```json
// plugin a
{
  "name": "egg-plugin-a",
  "eggPlugin": {
    "name": "a",
    "dependencies": ["b"]
  }
}

// plugin b
{
  "name": "egg-plugin-b",
  "eggPlugin": {
    "name": "b",
    "optionalDependencies": ["c"]
  }
}

// plugin c
{
  "name": "egg-plugin-c",
  "eggPlugin": {
    "name": "c"
  }
}
```

**注意：`dependencies` 和 `optionalDependencies` 的取值是另一个插件的 `eggPlugin.name`，而不是 `package name`。**

`dependencies` 和 `optionalDependencies` 是从 npm 借鉴来的概念，大多数情况下我们都使用 `dependencies`，这也是我们最推荐的依赖方式。那什么时候可以用 `optionalDependencies` 呢？大致就两种：

- 只在某些环境下才依赖，比如：一个鉴权插件，只在开发环境依赖一个 mock 数据的插件。
- 弱依赖，比如：A 依赖 B，但是如果没有 B，A 有相应的降级方案。

需要特别强调的是：如果采用 `optionalDependencies`，那么框架不会校验依赖的插件是否开启，它的作用仅仅是计算加载顺序。所以，这时候依赖方需要通过“接口探测”等方式来决定相应的处理逻辑。
## 插件能做什么？

上面给出了插件的定义，那插件到底能做什么？

### 扩展内置对象的接口

在插件相应的文件内对框架内置对象进行扩展，和应用一样：

- `app/extend/request.js` - 扩展 Koa#Request 类
- `app/extend/response.js` - 扩展 Koa#Response 类
- `app/extend/context.js` - 扩展 Koa#Context 类
- `app/extend/helper.js` - 扩展 Helper 类
- `app/extend/application.js` - 扩展 Application 类
- `app/extend/agent.js` - 扩展 Agent 类

### 插入自定义中间件

1. 首先在 `app/middleware` 目录下定义好中间件实现：

   ```js
   'use strict';

   const staticCache = require('koa-static-cache');
   const assert = require('assert');
   const mkdirp = require('mkdirp');

   module.exports = (options, app) => {
     assert.strictEqual(
       typeof options.dir,
       'string',
       'Must set `app.config.static.dir` when static plugin enable',
     );

     // 确保目录存在
     mkdirp.sync(options.dir);

     app.loggers.coreLogger.info(
       '[egg-static] starting static serve %s -> %s',
       options.prefix,
       options.dir,
     );

     return staticCache(options);
   };
   ```

2. 在 `app.js` 中将中间件插入到合适的位置（例如：下面将 static 中间件放到 bodyParser 之前）：

   ```js
   const assert = require('assert');

   module.exports = (app) => {
     // 将 static 中间件放到 bodyParser 之前
     const index = app.config.coreMiddleware.indexOf('bodyParser');
     assert(index >= 0, 'bodyParser 中间件必须存在');

     app.config.coreMiddleware.splice(index, 0, 'static');
   };
   ```

### 在应用启动时做一些初始化工作

- 我在启动前想读取一些本地配置：

  ```js
  // ${plugin_root}/app.js
  const fs = require('fs');
  const path = require('path');

  module.exports = (app) => {
    app.customData = fs.readFileSync(path.join(app.config.baseDir, 'data.bin'));

    app.coreLogger.info('Data read successfully');
  };
  ```

- 如果有异步启动逻辑，可以使用 `app.beforeStart` API：

  ```js
  // ${plugin_root}/app.js
  const MyClient = require('my-client');

  module.exports = (app) => {
    app.myClient = new MyClient();
    app.myClient.on('error', (err) => {
      app.coreLogger.error(err);
    });
    app.beforeStart(async () => {
      await app.myClient.ready();
      app.coreLogger.info('My client is ready');
    });
  };
  ```

- 也可以添加 agent 启动逻辑，使用 `agent.beforeStart` API：

  ```js
  // ${plugin_root}/agent.js
  const MyClient = require('my-client');

  module.exports = (agent) => {
    agent.myClient = new MyClient();
    agent.myClient.on('error', (err) => {
      agent.coreLogger.error(err);
    });
    agent.beforeStart(async () => {
      await agent.myClient.ready();
      agent.coreLogger.info('My client is ready');
    });
  };
  ```
### 设置定时任务

1. 在 `package.json` 里设置依赖 schedule 插件

   ```json
   {
     "name": "your-plugin",
     "eggPlugin": {
       "name": "your-plugin",
       "dependencies": ["schedule"]
     }
   }
   ```

2. 在 `${plugin_root}/app/schedule/` 目录下新建文件，编写你的定时任务。

   ```js
   exports.schedule = {
     type: 'worker',
     cron: '0 0 3 * * *',
     // interval: '1h',
     // immediate: true
   };

   exports.task = async (ctx) => {
     // 你的逻辑代码
   };
   ```

### 全局实例插件的最佳实践

许多插件的目的都是将一些已有的服务引入到框架中，如`egg-mysql`、`egg-oss`。它们都需要在 app 上创建对应的实例。而在开发这一类插件时，我们发现存在一些普遍性的问题：

- 在一个应用中同时使用同一个服务的不同实例（连接到两个不同的 MySQL 数据库）。
- 从其他服务获取配置后动态初始化连接（从配置中心获取到 MySQL 服务地址后再建立连接）。

如果让插件各自实现，可能会出现各种奇怪的配置方式和初始化方式，所以框架提供了 `app.addSingleton(name, creator)` 方法来统一这类服务的创建。需要注意的是，在使用 `app.addSingleton(name, creator)` 方法时，配置文件中一定要有 `client` 或者 `clients` 为 key 的配置。

#### 插件写法

以下代码展示了如何编写这类插件，它是对 `egg-mysql` 插件实现的简化：

```js
// egg-mysql/app.js
module.exports = app => {
  app.addSingleton('mysql', createMysql);
};

/**
 * @param  {Object} config   框架处理后的配置项，如应用配置了多个 MySQL 实例，每个配置项会分别传入并多次调用 createMysql
 * @param  {Application} app 当前应用
 * @return {Object}          返回创建的 MySQL 实例
 */
function createMysql(config, app) {
  assert(config.host && config.port && config.user && config.database);
  // 创建实例
  const client = new Mysql(config);

  // 应用启动前检查
  app.beforeStart(async () => {
    const rows = await client.query('select now() as currentTime;');
    app.coreLogger.info(`[egg-mysql] init instance success, rds currentTime: ${rows[0].currentTime}`);
  });

  return client;
}
```

初始化方法也支持 `async function`，便于有些需要异步获取配置文件的特殊插件：

```js
async function createMysql(config, app) {
  // 异步获取 mysql 配置
  const mysqlConfig = await app.configManager.getMysqlConfig(config.mysql);
  assert(mysqlConfig.host && mysqlConfig.port && mysqlConfig.user && mysqlConfig.database);
  // 创建实例
  const client = new Mysql(mysqlConfig);

  // 应用启动前检查
  const rows = await client.query('select now() as currentTime;');
  app.coreLogger.info(`[egg-mysql] init instance success, rds currentTime: ${rows[0].currentTime}`);

  return client;
}
```

可以看到，插件中我们只需要提供要挂载的字段和服务的初始化方法，所有配置管理、实例获取方式由框架封装并统一提供。
#### 应用层使用方案

##### 单实例

1. 在配置文件中声明 MySQL 的配置。

   ```js
   // config/config.default.js
   module.exports = {
     mysql: {
       client: {
         host: 'mysql.com',
         port: '3306',
         user: 'test_user',
         password: 'test_password',
         database: 'test',
       },
     },
   };
   ```

2. 直接通过 `app.mysql` 访问数据库。

   ```js
   // app/controller/post.js
   class PostController extends Controller {
     async list() {
       const posts = await this.app.mysql.query(sql, values);
     }
   }
   ```

##### 多实例

1. 同样需要在配置文件中声明 MySQL 的配置，不过和单实例时不同，配置项中需要有一个 `clients` 字段，分别声明不同实例的配置。同时，可以通过 `default` 字段配置多个实例中共享的配置（如 host 和 port）。需要注意的是，在这种情况下要用 `get` 方法指定相应的实例。（例如：使用 `app.mysql.get('db1').query()`，而不是直接使用 `app.mysql.query()`，否则可能得到一个 `undefined` ）。

   ```js
   // config/config.default.js
   exports.mysql = {
     clients: {
       // clientId，可通过 app.mysql.get('clientId') 访问客户端实例
       db1: {
         user: 'user1',
         password: 'upassword1',
         database: 'db1',
       },
       db2: {
         user: 'user2',
         password: 'upassword2',
         database: 'db2',
       },
     },
     // 所有数据库的默认配置
     default: {
       host: 'mysql.com',
       port: '3306',
     },
   };
   ```

2. 通过 `app.mysql.get('db1')` 获取对应的实例并使用。

   ```js
   // app/controller/post.js
   class PostController extends Controller {
     async list() {
       const posts = await this.app.mysql.get('db1').query(sql, values);
     }
   }
   ```

##### 动态创建实例

我们可以不需要将配置提前声明在配置文件中，而是在应用运行时动态初始化一个实例。

```js
// app.js
module.exports = app => {
  app.beforeStart(async () => {
    // 从配置中心获取 MySQL 配置 { host, port, password, ... }
    const mysqlConfig = await app.configCenter.fetch('mysql');
    // 动态创建 MySQL 实例
    app.database = await app.mysql.createInstanceAsync(mysqlConfig);
  });
};
```

通过 `app.database` 使用这个实例。

```js
// app/controller/post.js
class PostController extends Controller {
  async list() {
    const posts = await this.app.database.query(sql, values);
  }
}
```

**注意，在动态创建实例时，框架还会读取配置中 `default` 字段的配置作为默认配置项。**

### 插件的寻址规则

框架加载插件时，遵循以下寻址规则：

- 如果配置了 `path`，直接按照 `path` 加载。
- 没有 `path` 时，根据包名（package name）查找，查找顺序依次是：
  1. 应用根目录下的 `node_modules`
  2. 应用依赖框架路径下的 `node_modules`
  3. 当前路径下的 `node_modules`（主要是兼容单元测试场景）
### 插件规范

我们非常欢迎你贡献新的插件，同时也希望你遵守下面一些规范：

- 命名规范
  - `npm` 包名应以 `egg-` 开头，且应为全小写，例如：`egg-xx`。比较长的词组应使用中划线：`egg-foo-bar`。
  - 对应的插件名应使用小驼峰式命名。小驼峰式的转换规则以 `npm` 包名中的中划线为准，例如 `egg-foo-bar` => `fooBar`。
  - 对于既可以加中划线也可以不加的情况，不做强制约定，例如：`userservice`（`egg-userservice`）或 `user-service`（`egg-user-service`）都可。

- `package.json` 书写规范

  - 按照上面的文档添加 `eggPlugin` 节点。
  - 在 `keywords` 里添加 `egg`、`egg-plugin`、`eggPlugin` 等关键字，便于索引。

```json
{
  "name": "egg-view-nunjucks",
  "version": "1.0.0",
  "description": "view plugin for egg",
  "eggPlugin": {
    "name": "nunjucks",
    "dep": ["security"]
  },
  "keywords": [
    "egg",
    "egg-plugin",
    "eggPlugin",
    "egg-plugin-view",
    "egg-view",
    "nunjucks"
  ]
}
```

## 为何不使用 npm 包名来做插件名？

Egg 通过 `eggPlugin.name` 来定义插件名，只需应用或框架具备唯一性，也就是说**多个 npm 包可能有相同的插件名**。为什么这么设计呢？

首先，Egg 插件不仅支持 npm 包，还支持通过目录来寻找插件。在[渐进式开发](../intro/progressive.md)章节提到了如何使用这两个配置进行代码演进。目录对单元测试也更为友好。所以，Egg 无法通过 npm 包名来确保唯一性。

更重要的是，Egg 通过这种特性来做适配器。例如，[模板开发规范](./view-plugin.md#插件命名规范)定义的插件名为 `view`，存在 `egg-view-nunjucks`、`egg-view-react` 等插件，使用者只需要更换插件和修改模板，无需修改 Controller，因为所有的模板插件都实现了相同的 API。

**将相同功能的插件赋予相同的插件名，以及提供相同的 API，可以快速进行切换**。这种做法在模板、数据库等领域非常适用。


[egg-boilerplate-plugin]: https://github.com/eggjs/egg-boilerplate-plugin
[egg-mysql]: https://github.com/eggjs/egg-mysql
[egg-oss]: https://github.com/eggjs/egg-oss
