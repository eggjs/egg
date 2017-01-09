title: 框架开发
---

框架是一层抽象，我们可以基于 egg 开发上层框架，而且 egg 支持多层继承。

如果很多应用都有相同的需求就得提供框架的支持，这种需求存在以下的场景，但不限于此

1. 统一的技术选型，比如数据库、模板、前端框架及各种中间件设施都需要选型，而框架封装后保证应用使用一套架构。
1. 统一的默认配置，开源社区的配置可能不适用于公司，而又不希望应用去配置。
1. 统一的部署方案，通过框架和平台的双向控制，应用只需要关注自己的代码，具体查看[部署章节](./deployment.md)
1. 统一的代码风格，框架不仅仅解决代码重用问题，还可以对应用做一定约束，作为企业框架是很必要的。egg 在 koa 基础上做了很多约定，框架可以使用 [Loader](./loader.md)自己定义代码规则。

## 框架与多进程

框架的扩展是和多进程模型有关的，我们已经知道[多进程模型](./cluster.md)，也知道 Agent Worker 和 App Worker 的区别，所以我们需要扩展的类也有两个 Agent 和 Application，而这两个类的 API 不一定相同。

在 Agent Worker 启动的时候会实例化 Agent，而在 App Worker 启动时会实例化 Application，这两个类又同时继承 [EggCore](https://github.com/eggjs/egg-core)

EggCore 可以看做 koa Application 的升级版，默认内置 [Loader](./loader.md)、[Router](./router.md) 及应用异步启动等功能，可以看做是支持 Loader 的 koa。

```
       koa Application
              ^
           EggCore
              ^
       ┌──────┴───────┐
       │              │
   egg Agent      egg Application
      ^               ^
 agent worker     app worker
```

## 如何定制一个框架

接下来我们来定制一个框架，具体代码可以查看[示例](https://github.com/eggjs/examples/tree/master/framework)

### 框架 API

egg 框架提供了一些 API，所有继承的框架都需要提供，只增不减。这些 API 基本都有 Agent 和 Application 两份。

#### `egg.startCluster`

egg 的多进程启动器，由这个方法来启动 Master，主要的功能实现在 [egg-cluster]() 上。所以直接使用 EggCore 还是单进程的方式，而 egg 实现了多进程。

```js
const startCluster = require('egg').startCluster;
startCluster({
  // 应用的代码目录
  baseDir: '/path/to/app',
  // 需要通过这个参数来指定框架目录
  customEgg: '/path/to/framework',
}, () => {
  console.log('app started');
});
```

所有参数可以查看 [egg-cluster](https://github.com/eggjs/egg-cluster#options)

#### `egg.Application` 和 `egg.Agent`

进程中的唯一单例，但 Application 和 Agent 存在一定差异。如果框架继承于 egg，会定制这两个类，那 framework 应该 export 这两个类。

#### `egg.AppWorkerLoader` 和 `egg.AgentWorkerLoader`

框架也存在定制 Loader 的场景，覆盖原方法或者新加载目录都需要提供自己的 Loader，而且必须要继承 egg 的 Loader。

### 框架继承

框架支持继承关系，可以把框架比作一个类，那么基类就是 egg 框架，如果想对 egg 做扩展就继承。

首先定义一个框架需要实现 egg 所有的 API

```js
// package.json
{
  "name": "example",
  "dependencies": {
    "egg": "^1.0.0",
    "egg-bin": "^1.0.0"
  },
  "scripts": {
    "dev": "egg-bin dev"
  }
}

// index.js
const egg = require('egg');
// 将所有的 API clone 一份
Object.assign(exports, egg);
```

自定义 Application

```js
// index.js
exports.Application = require('./lib/application.js');

// lib/application.js
const path = require('path');
const Application = require('egg').Application;
const EGG_PATH = Symbol.for('egg#eggPath');
class ExampleApplication extends Application {
  get [EGG_PATH]() {
    // 返回 framework 路径
    return path.dirname(__dirname);
  }
}
module.exports = ExampleApplication;
```

启动时需要指定 example 找到他的 Application，指定 `--framework` 从 node_modules 找指定模块作为框架，默认会使用 egg。

```json
{
  "scripts": {
    "dev": "egg-bin dev --framework example"
  }
}
```

现在 exmaple 目录已经是一个 loadUnit，那么相应目录的文件都会被加载，查看[框架被加载的文件](./loader.md)。

### 框架继承原理

使用 `Symbol.for('egg#eggPath')` 来指定当前框架的路径，目的是让 Loader 能探测到框架的路径。为什么这样实现呢？其实最简单的方式是将框架的路径传递给 Loader，但我们需要实现多级框架继承，每一层框架都要提供自己的当前路径，并且需要继承存在先后顺序。

现在的实现方案是基于类继承的，每一层框架都必须继承上一层框架并且指定 eggPath，然后遍历原型链就能获取每一层的框架路径了。

比如有三层框架部门框架（department）> 企业框架（enterprise）> egg

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

以上均是伪代码，为了详细说明框架路径的加载过程，不过 egg 已经在[本地开发](../core/development.md)和[应用部署](./deployment.md)提供了很好的工具，不需要自己实现。

### 自定义 Agent

上面的例子自定义了 Application，因为 egg 是多进程模型，所以还需要定义 Agent，原理是一样的。

```js
// index.js
exports.Agent = require('./lib/agent.js');

// lib/agent.js
const path = require('path');
const Agent = require('egg').Agent;
const EGG_PATH = Symbol.for('egg#eggPath');
class ExampleAgent extends Agent {
  get [EGG_PATH]() {
    // 返回 framework 路径
    return path.dirname(__dirname);
  }
}
module.exports = ExampleAgent;
```

但因为 Agent 和 Application 是两个实例，所以 API 有可能不一致。

### 自定义 Loader

框架扩展很大一个原因就是自定义 Loader，使用加载的访问能做很多约定，不会让应用代码过于随意。

自定义 Loader 也是用 `Symbol.for('egg#loader')` 的方式，主要的原因还是使用原型链，上层框架可覆盖底层 Loader，在上面例子的基础上

```js
// index.js
// 自定义的 Loader 也需要 export，上层框架需要基于这个扩展
exports.AppWorkerLoader = require('./lib/app_worker_loader.js');

// lib/application.js
const path = require('path');
const Application = require('egg').Application;
const ExampleAppWorkerLoader = require('./app_worker_loader');
const EGG_PATH = Symbol.for('egg#eggPath');
const EGG_LOADER = Symbol.for('egg#loader');
class ExampleApplication extends Application {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
  // 覆盖 egg 的 Loader，启动时使用这个 Loader
  get [EGG_LOADER]() {
    return ExampleAppWorkerLoader;
  }
}
module.exports = ExampleApplication;

// lib/app_worker_loader.js
class ExampleAppWorkerLoader extends AppWorkerLoader {
  load() {
    super.load();
    // 自己扩展
  }
}
module.exports = ExampleAppWorkerLoader;
```

AgentWorkerLoader 扩展也类似，这里不再举例。AgentWorkerLoader 加载的文件可以于 AppWorkerLoader 不同，比如 默认加载时，egg 的 AppWorkerLoader 会加载 `app.js` 而 AgentWorkerLoader 加载的是 `agent.js`。

## 框架启动原理

框架启动在[多进程模型](./cluster.md)、[Loader](./loader.md)、[插件](./plugin.md)中或多或少都提过，这里系统的梳理下启动顺序。

- startCluster 启动传入 `baseDir` 和 `customEgg`，Master 进程启动
- Master 先 fork Agent Worker
  - 根据 customEgg 找到框架目录，实例化该框架的 Agent 类
  - Agent 找到定义的 AgentWorkerLoader，开始进行加载
  - AgentWorkerLoader，开始进行加载 整个加载过程是同步的，按 plugin > config > extend > `agent.js` > 其他文件顺序加载
  - `agent.js` 可自定义初始化，支持异步启动，如果定义了 beforeStart 会等待执行完成之后通知 Master 启动完成。
- Master 得到 Agent Worker 启动成功的消息，使用 cluster fork App Worker
  - App Worker 有多个进程，所以这几个进程是并行启动的，但执行逻辑是一致的
  - 单个 App Worker 和 Agent 类似，通过 customEgg 找到框架目录，实例化该框架的 Application 类
  - Application 找到 AppWorkerLoader，开始进行加载，顺序也是类似的，会异步等待，完成后通知 Master 启动完成
- Master 等待多个 App Worker 的成功消息后启动完成，能对外提供服务。

## 框架测试

在看下文之前请先查看[单元测试章节](../core/unittest.md)，框架测试的大部分使用场景和应用类似。

### 初始化

框架的初始化方式有一定差异

```js
describe('/test/index.test.js', () => {
  let app;
  before(() => {
    app = mm.app({
      // 转换成 test/fixtures/apps/example
      baseDir: 'apps/example',
      customEgg: true,
      cache: false,
    });
    return app.ready();
  });
  after(() => app.close());
  it('should success', () => {
    return request(app.callback())
    .get('/')
    .expect(200);
  });
});
```

- 框架和应用不同，应用测试当前代码，而框架是测试框架代码，所以会频繁更换 baseDir 达到测试各种应用的目的。
- baseDir 有潜规则，我们一般会把测试的应用代码放到 `test/fixtures` 下，所以自动补全，也可以传入绝对路径。
- 必须指定 `customEgg: true`，告知当前路径为框架路径，也可以传入绝对路径。
- app 应用需要在 before 等待 ready，不然在 testcase 里无法获取部分 API
- 框架在测试完毕后需要使用 `app.close()` 关闭，不然会有遗留问题，比如日志写文件未关闭导致 fd 不够。

### 缓存

在测试多环境场景的使用需要使用到 cache 参数，因为 `mm.app` 默认有缓存，当第一次加载过后再次加载会直接读取缓存，那么设置的环境也不会生效。

```js
describe('/test/index.test.js', () => {
  let app;
  afterEach(() => app.close());

  it('should test on local', () => {
    mm.env('local');
    app = mm.app({
      baseDir: 'apps/example',
      customEgg: true,
      cache: false,
    });
    return app.ready();
  });
  it('should test on prod', () => {
    mm.env('prod');
    app = mm.app({
      baseDir: 'apps/example',
      customEgg: true,
      cache: false,
    });
    return app.ready();
  });
});
```

### 多进程测试

很少场景会使用多进程测试，因为多进程无法进行 API 级别的 mock 导致测试成本很高，而进程在有覆盖率的场景启动很慢，测试会超时。但多进程测试是验证多进程模型最好的方式，还可以测试 stdout 和 stderr。

多进程测试和 `mm.app` 参数一致，但 app 的 API 完全不同，不过 supertest 依然可用。

```js
describe('/test/index.test.js', () => {
  let app;
  before(() => {
    app = mm.cluster({
      baseDir: 'apps/example',
      customEgg: true,
    });
    return app.ready();
  });
  after(() => app.close());
  it('should success', () => {
    return request(app.callback())
    .get('/')
    .expect(200);
  });
});
```

多进程测试还可以测试 stdout/stderr，因为 `mm.cluster` 是基于 [coffee](https://github.com/popomore/coffee) 扩展的，可进行进程测试。

```js
describe('/test/index.test.js', () => {
  let app;
  before(() => {
    app = mm.cluster({
      baseDir: 'apps/example',
      customEgg: true,
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
