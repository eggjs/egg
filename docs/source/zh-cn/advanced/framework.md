title: 框架开发
---

如果你的团队遇到过：

- 维护很多个项目，每个项目都需要复制拷贝诸如 `gulpfile.js` / `webpack.config.js` 之类的文件。
- 每个项目都需要使用一些相同的类库，相同的配置。
- 在新项目中对上面的配置做了一个优化后，如何同步到其他项目？

如果你的团队需要：

- 统一的技术选型，比如数据库、模板、前端框架及各种中间件设施都需要选型，而框架封装后保证应用使用一套架构。
- 统一的默认配置，开源社区的配置可能不适用于公司，而又不希望应用去配置。
- 统一的部署方案，通过框架和平台的双向控制，应用只需要关注自己的代码，具体查看[应用部署](../core/deployment.md)
- 统一的代码风格，框架不仅仅解决代码重用问题，还可以对应用做一定约束，作为企业框架是很必要的。Egg 在 Koa 基础上做了很多约定，框架可以使用 [Loader](./loader.md) 自己定义代码规则。

为此，Egg 为团队架构师和技术负责人提供 `框架定制` 的能力，框架是一层抽象，可以基于 Egg 去封装上层框架，并且 Egg 支持多层继承。

这样，整个团队就可以遵循统一的方案，并且在项目中可以根据业务场景自行使用插件做差异化，当后者验证为最佳实践后，就能下沉到框架中，其他项目仅需简单的升级下框架的版本即可享受到。

具体可以参见[渐进式开发](../tutorials/progressive.md)。

## 框架与多进程

框架的扩展是和多进程模型有关的，我们已经知道[多进程模型](../core/cluster-and-ipc.md)，也知道 Agent Worker 和 App Worker 的区别，所以我们需要扩展的类也有两个 Agent 和 Application，而这两个类的 API 不一定相同。

在 Agent Worker 启动的时候会实例化 Agent，而在 App Worker 启动时会实例化 Application，这两个类又同时继承 [EggCore](https://github.com/eggjs/egg-core)。

EggCore 可以看做 Koa Application 的升级版，默认内置 [Loader](./loader.md)、[Router](../basics/router.md) 及应用异步启动等功能，可以看做是支持 Loader 的 Koa。

```
       Koa Application
              ^
           EggCore
              ^
       ┌──────┴───────┐
       │              │
   Egg Agent      Egg Application
      ^               ^
 agent worker     app worker
```

## 如何定制一个框架

你可以直接通过 [egg-init] 选择 [framework](https://github.com/eggjs/egg-boilerplate-framework) 脚手架来快速上手。

```bash
$ egg-init --type=framework yadan
$ cd yadan
$ npm i
$ npm test
```

但同样，为了让大家了解细节，接下来我们还是手把手来定制一个框架，具体代码可以查看[示例](https://github.com/eggjs/examples/tree/master/framework)

### 框架 API

Egg 框架提供了一些 API，所有继承的框架都需要提供，只增不减。这些 API 基本都有 Agent 和 Application 两份。

#### `egg.startCluster`

Egg 的多进程启动器，由这个方法来启动 Master，主要的功能实现在 [egg-cluster](https://github.com/eggjs/egg-cluster) 上。所以直接使用 EggCore 还是单进程的方式，而 Egg 实现了多进程。

```js
const startCluster = require('egg').startCluster;
startCluster({
  // 应用的代码目录
  baseDir: '/path/to/app',
  // 需要通过这个参数来指定框架目录
  framework: '/path/to/framework',
}, () => {
  console.log('app started');
});
```

所有参数可以查看 [egg-cluster](https://github.com/eggjs/egg-cluster#options)

#### `egg.Application` 和 `egg.Agent`

进程中的唯一单例，但 Application 和 Agent 存在一定差异。如果框架继承于 Egg，会定制这两个类，那 framework 应该 export 这两个类。

#### `egg.AppWorkerLoader` 和 `egg.AgentWorkerLoader`

框架也存在定制 Loader 的场景，覆盖原方法或者新加载目录都需要提供自己的 Loader，而且必须要继承 Egg 的 Loader。

### 框架继承

框架支持继承关系，可以把框架比作一个类，那么基类就是 Egg 框架，如果想对 Egg 做扩展就继承。

首先定义一个框架需要实现 Egg 所有的 API

```js
// package.json
{
  "name": "yadan",
  "dependencies": {
    "egg": "^2.0.0"
  }
}

// index.js
module.exports = require('./lib/framework.js');

// lib/framework.js
const path = require('path');
const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');

class Application extends egg.Application {
  get [EGG_PATH]() {
    // 返回 framework 路径
    return path.dirname(__dirname);
  }
}

// 覆盖了 Egg 的 Application
module.exports = Object.assign(egg, {
  Application,
});
```

应用启动时需要指定框架名（在 `package.json` 指定 `egg.framework`，默认为 egg），Loader 将从 `node_modules` 找指定模块作为框架，并加载其 export 的 Application。

```json
{
  "scripts": {
    "dev": "egg-bin dev"
  },
  "egg": {
    "framework": "yadan"
  }
}
```

现在 yadan 框架目录已经是一个 loadUnit，那么相应目录和文件（如 `app` 和 `config`）都会被加载，查看[框架被加载的文件](./loader.md)。

### 框架继承原理

使用 `Symbol.for('egg#eggPath')` 来指定当前框架的路径，目的是让 Loader 能探测到框架的路径。为什么这样实现呢？其实最简单的方式是将框架的路径传递给 Loader，但我们需要实现多级框架继承，每一层框架都要提供自己的当前路径，并且需要继承存在先后顺序。

现在的实现方案是基于类继承的，每一层框架都必须继承上一层框架并且指定 eggPath，然后遍历原型链就能获取每一层的框架路径了。

比如有三层框架：部门框架（department）> 企业框架（enterprise）> Egg

```js
// enterprise
const Application = require('egg').Application;
class Enterprise extends Application {
  get [EGG_PATH]() {
    return '/path/to/enterprise';
  }
}
// 自定义模块 Application
exports.Application = Enterprise;

// department
const Application = require('enterprise').Application;
// 继承 enterprise 的 Application
class department extends Application {
  get [EGG_PATH]() {
    return '/path/to/department';
  }
}

// 启动需要传入 department 的框架路径才能获取 Application
const Application = require('department').Application;
const app = new Application();
app.ready();
```

以上均是伪代码，为了详细说明框架路径的加载过程，不过 Egg 已经在[本地开发](../core/development.md)和[应用部署](../core/deployment.md)提供了很好的工具，不需要自己实现。

### 自定义 Agent

上面的例子自定义了 Application，因为 Egg 是多进程模型，所以还需要定义 Agent，原理是一样的。

```js
// lib/framework.js
const path = require('path');
const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');

class Application extends egg.Application {
  get [EGG_PATH]() {
    // 返回 framework 路径
    return path.dirname(__dirname);
  }
}

class Agent extends egg.Agent {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
}

// 覆盖了 Egg 的 Application
module.exports = Object.assign(egg, {
  Application,
  Agent,
});
```

**但因为 Agent 和 Application 是两个实例，所以 API 有可能不一致。**

### 自定义 Loader

Loader 应用启动的核心，使用它还能规范应用代码，我们可以基于这个类扩展更多功能，比如加载数据代码。扩展 Loader 还能覆盖默认的实现，或调整现有的加载顺序等。

自定义 Loader 也是用 `Symbol.for('egg#loader')` 的方式，主要的原因还是使用原型链，上层框架可覆盖底层 Loader，在上面例子的基础上

```js
// lib/framework.js
const path = require('path');
const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');

class YadanAppWorkerLoader extends egg.AppWorkerLoader {
  load() {
    super.load();
    // 自己扩展
  }
}

class Application extends egg.Application {
  get [EGG_PATH]() {
    // 返回 framework 路径
    return path.dirname(__dirname);
  }
  // 覆盖 Egg 的 Loader，启动时使用这个 Loader
  get [EGG_LOADER]() {
    return YadanAppWorkerLoader;
  }
}

// 覆盖了 Egg 的 Application
module.exports = Object.assign(egg, {
  Application,
  // 自定义的 Loader 也需要 export，上层框架需要基于这个扩展
  AppWorkerLoader: YadanAppWorkerLoader,
});
```

AgentWorkerLoader 扩展也类似，这里不再举例。AgentWorkerLoader 加载的文件可以于 AppWorkerLoader 不同，比如：默认加载时，Egg 的 AppWorkerLoader 会加载 `app.js` 而 AgentWorkerLoader 加载的是 `agent.js`。

## 框架启动原理

框架启动在[多进程模型](../core/cluster-and-ipc.md)、[Loader](./loader.md)、[插件](./plugin.md)中或多或少都提过，这里系统的梳理下启动顺序。

- startCluster 启动传入 `baseDir` 和 `framework`，Master 进程启动
- Master 先 fork Agent Worker
  - 根据 framework 找到框架目录，实例化该框架的 Agent 类
  - Agent 找到定义的 AgentWorkerLoader，开始进行加载
  - AgentWorkerLoader，开始进行加载 整个加载过程是同步的，按 plugin > config > extend > `agent.js` > 其他文件顺序加载
  - `agent.js` 可自定义初始化，支持异步启动，如果定义了 beforeStart 会等待执行完成之后通知 Master 启动完成。
- Master 得到 Agent Worker 启动成功的消息，使用 cluster fork App Worker
  - App Worker 有多个进程，所以这几个进程是并行启动的，但执行逻辑是一致的
  - 单个 App Worker 和 Agent 类似，通过 framework 找到框架目录，实例化该框架的 Application 类
  - Application 找到 AppWorkerLoader，开始进行加载，顺序也是类似的，会异步等待，完成后通知 Master 启动完成
- Master 等待多个 App Worker 的成功消息后启动完成，能对外提供服务。

## 框架测试

在看下文之前请先查看[单元测试章节](../core/unittest.md)，框架测试的大部分使用场景和应用类似。

### 初始化

框架的初始化方式有一定差异

```js
const mock = require('egg-mock');
describe('test/index.test.js', () => {
  let app;
  before(() => {
    app = mock.app({
      // 转换成 test/fixtures/apps/example
      baseDir: 'apps/example',
      // 重要：配置 framework
      framework: true,
    });
    return app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  it('should success', () => {
    return app.httpRequest()
      .get('/')
      .expect(200);
  });
});
```

- 框架和应用不同，应用测试当前代码，而框架是测试框架代码，所以会频繁更换 baseDir 达到测试各种应用的目的。
- baseDir 有潜规则，我们一般会把测试的应用代码放到 `test/fixtures` 下，所以自动补全，也可以传入绝对路径。
- 必须指定 `framework: true`，告知当前路径为框架路径，也可以传入绝对路径。
- app 应用需要在 before 等待 ready，不然在 testcase 里无法获取部分 API
- 框架在测试完毕后需要使用 `app.close()` 关闭，不然会有遗留问题，比如日志写文件未关闭导致 fd 不够。

### 缓存

在测试多环境场景需要使用到 cache 参数，因为 `mm.app` 默认有缓存，当第一次加载过后再次加载会直接读取缓存，那么设置的环境也不会生效。

```js
const mock = require('egg-mock');
describe('/test/index.test.js', () => {
  let app;
  afterEach(() => app.close());

  it('should test on local', () => {
    mock.env('local');
    app = mock.app({
      baseDir: 'apps/example',
      framework: true,
      cache: false,
    });
    return app.ready();
  });
  it('should test on prod', () => {
    mock.env('prod');
    app = mock.app({
      baseDir: 'apps/example',
      framework: true,
      cache: false,
    });
    return app.ready();
  });
});
```

### 多进程测试

很少场景会使用多进程测试，因为多进程无法进行 API 级别的 mock 导致测试成本很高，而进程在有覆盖率的场景启动很慢，测试会超时。但多进程测试是验证多进程模型最好的方式，还可以测试 stdout 和 stderr。

多进程测试和 `mm.app` 参数一致，但 app 的 API 完全不同，不过 SuperTest 依然可用。

```js
const mock = require('egg-mock');
describe('/test/index.test.js', () => {
  let app;
  before(() => {
    app = mock.cluster({
      baseDir: 'apps/example',
      framework: true,
    });
    return app.ready();
  });
  after(() => app.close());
  afterEach(mock.restore);
  it('should success', () => {
    return app.httpRequest()
      .get('/')
      .expect(200);
  });
});
```

多进程测试还可以测试 stdout/stderr，因为 `mm.cluster` 是基于 [coffee](https://github.com/popomore/coffee) 扩展的，可进行进程测试。

```js
const mock = require('egg-mock');
describe('/test/index.test.js', () => {
  let app;
  before(() => {
    app = mock.cluster({
      baseDir: 'apps/example',
      framework: true,
    });
    return app.ready();
  });
  after(() => app.close());
  it('should get `started`', () => {
    // 判断终端输出
    app.expect('stdout', /started/);
  });
});
```

[egg-bin]: https://github.com/eggjs/egg-bin
