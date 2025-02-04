---
title: TypeScript
---

> [TypeScript](https://www.typescriptlang.org/) 是 JavaScript 的一个类型超集，它可以被编译成纯 JavaScript。

TypeScript 提供的静态类型检查、智能提示和 IDE 友好性等特性，对于大规模企业级应用来说，具有极高的价值。有关详细信息，请参见：[TypeScript 体系调研报告](https://juejin.im/post/59c46bc86fb9a00a4636f939)。

然而，在之前使用 TypeScript 开发 Egg 应用时，会遇到一些影响**开发者体验**的问题：

- Egg 特有的 Loader 动态加载机制，使得 TypeScript 无法进行某些依赖的静态分析。
- 在自动合并配置的机制中，如何在 `config.{env}.js` 中修改插件提供的配置，同时能够进行校验并智能提示？
- 开发期间需要启动一个单独的 `tsc -w` 进程来构建代码，这将导致临时文件位置的不确定性以及 `npm scripts` 的复杂性。
- 单元测试、覆盖率测试以及线上错误的堆栈如何指向 TypeScript 源文件，而非编译后的 JavaScript 文件。

本文主要介绍：

- **应用层 TypeScript 开发规范**
- **我们在工具链方面的支持，以解决上述问题，让开发者基本无感知的同时，也保持了一致性的体验。**

关于具体开发过程的详细信息，请参见：[[RFC] TypeScript tool support](https://github.com/eggjs/egg/issues/2272)。

---

## 快速入门

通过骨架快速初始化一个项目：

```bash
$ mkdir showcase && cd showcase
$ npm init egg --type=ts
$ npm i
$ npm run dev
```

上面的骨架会生成一个极简版的示例，更完整的示例请参见：[eggjs/examples/hackernews-async-ts](https://github.com/eggjs/examples/tree/master/hackernews-async-ts)

![tegg.gif](https://user-images.githubusercontent.com/227713/38358019-bf7890fa-38f6-11e8-8955-ea072ac6dc8c.gif)

---

## 目录规范

**约束条件：**

- Egg 目前没有打算采用 TypeScript 进行重写。
- Egg 及相关插件会提供 `index.d.ts` 文件以方便开发者使用。
- TypeScript 是社区的一种实践方式，我们通过工具链提供一定程度的支持。
- TypeScript 要求版本至少为 2.8。

整体的目录结构与一般的 Egg 项目没有太大差异：

- 采用 `typescript` 代码风格，文件后缀名为 `.ts`。
- `typings` 目录用于存放 `d.ts` 文件（大部分文件可以自动生成）。

```bash
showcase
├── app
│   ├── controller
│   │   └── home.ts
│   ├── service
│   │   └── news.ts
│   └── router.ts
├── config
│   ├── config.default.ts
│   ├── config.local.ts
│   ├── config.prod.ts
│   └── plugin.ts
├── test
│   └── **/*.test.ts
├── typings
│   └── **/*.d.ts
├── README.md
├── package.json
├── tsconfig.json
└── tslint.json
```

### 控制器（Controller）

```typescript
// app/controller/home.ts
import { Controller } from 'egg';

export default class HomeController extends Controller {
  public async index() {
    const { ctx, service } = this;
    const page = ctx.query.page;
    const result = await service.news.list(page);
    await ctx.render('home.tpl', result);
  }
}
```

### 路由（Router）

```typescript
// app/router.ts
import { Application } from 'egg';

export default (app: Application) => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
};
```

### 服务（Service）

```typescript
// app/service/news.ts
import { Service } from 'egg';

export default class NewsService extends Service {
  public async list(page?: number): Promise<NewsItem[]> {
    return [];
  }
}

export interface NewsItem {
  id: number;
  title: string;
}
```
### 中间件（Middleware）

```typescript
import { Context } from 'egg';

// 这是你自定义的中间件
export default function fooMiddleware(): any {
  return async (ctx: Context, next: () => Promise<any>) => {
    // 你可以获取 config 的配置：
    // const config = ctx.app.config;
    // config.xxx...
    await next();
  };
}
```

当某个 Middleware 文件的名称与 config 中某个属性名一致时，Middleware 会自动把这个属性下的所有配置读取过来。

假设你有一个 Middleware，名称是 `uuid`，在 `config.default.js` 中的配置如下：

```javascript
'use strict';

import { EggAppConfig, PowerPartial } from 'egg';

export default function(appInfo: EggAppConfig) {
  const config = {} as PowerPartial<EggAppConfig>;

  config.keys = appInfo.name + '123123';

  config.middleware = ['uuid'];

  config.security = {
    csrf: {
      ignore: '123',
    },
  };

  const bizConfig = {
    local: {
      msg: 'local',
    },

    uuid: {
      name: 'ebuuid',
      maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
    },
  };

  return {
    ...config,
    ...bizConfig,
  };
}
```

在对应的 `uuid` 中间件中：

```typescript
// app/middleware/uuid.ts

import { Context, Application, EggAppConfig } from 'egg';

export default function uuidMiddleWare(
  options: EggAppConfig['uuid'],
  app: Application,
): any {
  return async (ctx: Context, next: () => Promise<any>) => {
    // name 就是 `config.default.js` 中 `uuid` 下的属性
    console.info(options.name);
    await next();
  };
}
```

**注意：目前中间件的返回值必须是 `any` 类型。这是因为，如果使用 Koa 的 `IRouteContext` 类和 Egg 的 `Context` 类时，它们不兼容，将导致编译报错。**

### 扩展（Extend）

```typescript
// app/extend/context.ts
import { Context } from 'egg';

export default {
  isAjax(this: Context) {
    return this.get('X-Requested-With') === 'XMLHttpRequest';
  },
};

// app.ts
export default (app) => {
  app.beforeStart(async () => {
    await Promise.resolve('egg + ts');
  });
};
```
### 配置（Config）

`Config` 这部分稍微有点复杂，因为要支持：

- 在 Controller，Service 那边使用配置，需支持多级提示，并自动关联。
- Config 内部，`config.view = {}` 的写法，也应该支持提示。
- 在 `config.{env}.ts` 里可以用到 `config.default.ts` 自定义配置的提示。

```typescript
// app/config/config.default.ts
import { EggAppInfo, EggAppConfig, PowerPartial } from 'egg';

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  // 覆盖框架，插件的配置
  config.keys = appInfo.name + '123456';
  config.view = {
    defaultViewEngine: 'nunjucks',
    mapping: {
      '.tpl': 'nunjucks',
    }
  };

  // 应用本身的配置
  const bizConfig = {};
  bizConfig.news = {
    pageSize: 30,
    serverUrl: 'https://hacker-news.firebaseio.com/v0',
  };
  
  // 目的是将业务配置属性合并到 EggAppConfig 中返回
  return {
    // 如果直接返回 config ，则将该类型合并到 EggAppConfig 的时候可能会出现 circulate type 错误。
    ...(config as {}),
    ...bizConfig
  };
};
```

**注意，上述写法将 `config.default.ts` 中返回的配置类型合并到 egg 的 `EggAppConfig` 类型中时需要 egg-ts-helper 的配合。**

当 `EggAppConfig` 合并 `config.default.ts` 的类型后，在其他 `config.{env}.ts` 中这么写就也可以获得在 `config.default.ts` 定义的自定义配置的智能提示：

```typescript
// app/config/config.local.ts
import { EggAppConfig } from 'egg';

export default () => {
  const config = {} as PowerPartial<EggAppConfig>;
  // 这里就可以获得 news 的智能提示了
  config.news = {
    pageSize: 20,
  };
  return config;
};
```

备注：

- TS 的 `Conditional Types` 是我们能完美解决 Config 提示的关键。
- 有兴趣的可以浏览 `egg/index.d.ts` 里面 `PowerPartial` 的实现。

```typescript
// {egg}/index.d.ts
type PowerPartial<T> = {
  [U in keyof T]?: T[U] extends {} ? PowerPartial<T[U]> : T[U];
};
```

### 插件（Plugin）

```javascript
// config/plugin.ts
import { EggPlugin } from 'egg';

const plugin: EggPlugin = {
  static: true,
  nunjucks: {
    enable: true,
    package: 'egg-view-nunjucks',
  },
};

export default plugin;
```

### 生命周期（Lifecycle）

```typescript
// app.ts
import { Application, IBoot } from 'egg';

export default class FooBoot implements IBoot {
  private readonly app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  configWillLoad() {
    // 预备调用 configDidLoad，
    // Config 和 plugin 文件已被引用，
    // 这是修改配置的最后机会。
  }

  configDidLoad() {
    // Config 和 plugin 文件已加载。
  }

  async didLoad() {
    // 所有文件已加载，此时可以启动插件。
  }

  async willReady() {
    // 所有插件已启动，这里可以执行一些在应用准备好之前的操作。
  }

  async didReady() {
    // Worker 已准备好，可以执行一些不会阻塞应用启动的操作。
  }

  async serverDidReady() {
    // 服务器已监听。
  }

  async beforeClose() {
    // 应用关闭前执行的操作。
  }
}
```
### TS 类型定义（Typings）

该目录为 TS 的规范，在里面的 `**/*.d.ts` 文件将被自动识别。

- 开发者需要手写的建议放在 `typings/index.d.ts` 中。
- 工具会自动生成 `typings/{app,config}/**.d.ts`，请勿自行修改，避免被覆盖（见下文）。

---

## 开发期

### ts-node

`egg-bin` 已经内建了 [ts-node](https://github.com/TypeStrong/ts-node)，`egg loader` 在开发期会自动加载 `*.ts` 并内存编译。

目前已支持 `dev` / `debug` / `test` / `cov`。

开发者仅需简单配置下 `package.json`：

```json
{
  "name": "showcase",
  "egg": {
    "typescript": true
  }
}
```

### egg-ts-helper

由于 Egg 的自动加载机制，导致 TS 无法静态分析依赖，关联提示。幸运的是，TS 黑魔法比较多，我们可以通过 TS 的 [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) 编写 `d.ts` 来辅助。

例如，`app/service/news.ts` 会自动挂载为 `ctx.service.news`，通过如下写法即可识别到：

```typescript
// typings/app/service/index.d.ts
import News from '../../../app/service/News';

declare module 'egg' {
  interface IService {
    news: News;
  }
}
```

手动编写这些文件，未免有点繁琐，因此我们提供了 [egg-ts-helper](https://github.com/whxaxes/egg-ts-helper) 工具来自动分析源代码生成对应的 `d.ts` 文件。

只需配置下 `package.json`：

```json
{
  "egg": {
    "declarations": true
  },
  "scripts": {
    "dev": "egg-bin dev",
    "test-local": "egg-bin test",
    "clean": "ets clean"
  }
}
```

开发期将自动生成对应的 `d.ts` 到 `typings/{app,config}/` 下，请勿自行修改，避免被覆盖。

目前该工具已经能支持 ts 以及 js 的 egg 项目，均能获得相应的智能提示。

### 单元测试和覆盖率（Unit Test and Coverage）

单元测试当然少不了：

```typescript
// test/app/service/news.test.ts
import assert from 'assert';
import { Context } from 'egg';
import { app } from 'egg-mock/bootstrap';

describe('test/app/service/news.test.js', () => {
  let ctx: Context;

  before(async () => {
    ctx = app.mockContext();
  });

  it('list()', async () => {
    const list = await ctx.service.news.list();
    assert(list.length === 30);
  });
});
```

运行命令也跟之前一样，并内置了错误堆栈和覆盖率的支持：

```json
{
  "name": "showcase",
  "egg": {
    "typescript": true,
    "declarations": true
  },
  "scripts": {
    "test": "npm run lint -- --fix && npm run test-local",
    "test-local": "egg-bin test",
    "cov": "egg-bin cov",
    "lint": "tslint ."
  }
}
```

### 调试（Debug）

断点调试与之前没有什么区别，会自动通过 `sourcemap` 命中正确的位置。

```json
{
  "name": "showcase",
  "egg": {
    "typescript": true,
    "declarations": true
  },
  "scripts": {
    "debug": "egg-bin debug",
    "debug-test": "npm run test-local"
  }
}
```

- [使用 VSCode 进行调试](https://eggjs.org/zh-cn/core/development.html#使用-vscode-进行调试)
- [VSCode 调试 Egg 完美版 - 进化史](https://github.com/atian25/blog/issues/25)

---
## 部署（Deploy）

### 构建（Build）

- 正式环境下，我们更倾向于把 `ts` 构建为 `js`，建议在 `ci` 上构建并打包。

配置 `package.json` ：

```json
{
  "devDependencies": {
    "@eggjs/tsconfig": "^1.0.0"
  },
  "egg": {
    "typescript": true,
    "declarations": true
  },
  "scripts": {
    "start": "egg-scripts start --title=egg-server-showcase",
    "stop": "egg-scripts stop --title=egg-server-showcase",
    "tsc": "ets && tsc -p tsconfig.json",
    "ci": "npm run lint && npm run cov && npm run tsc",
    "clean": "ets clean"
  }
}
```

对应的 `tsconfig.json` ：

```json
{
  "extends": "@eggjs/tsconfig",
  "exclude": ["app/public", "app/web", "app/views"]
}
```

**注意：** 当有同名的 `ts` 和 `js` 文件时，egg 会优先加载 `js` 文件。因此在开发期，`egg-ts-helper` 会自动调用清除同名的 `js` 文件，也可通过 `npm run clean` 手动清除。

### 错误堆栈（Error Stack）

线上服务的代码是经过编译后的 `js`，而我们期望看到的错误堆栈是指向 `TS` 源码。
因此：

- 在构建的时候，需配置 `inlineSourceMap: true` 在 `js` 底部插入 `sourcemap` 信息。
- 在 `egg-scripts` 内建了处理，会自动纠正为正确的错误堆栈，应用开发者无需担心。

具体内幕参见以下链接：
- [知乎专栏](https://zhuanlan.zhihu.com/p/26267678)
- [GitHub PR](https://github.com/eggjs/egg-scripts/pull/19)

---

## 插件 / 框架开发指南

**指导原则：**

- 不建议使用 `TS` 直接开发插件/框架，发布到 `npm` 的插件应该是 `js` 形式。
- 当你开发了一个插件/框架后，需要提供对应的 `index.d.ts`。
- 通过 [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) 将插件/框架的功能注入到 `Egg` 中。
- 都挂载到 `egg` 这个模块，不要用上层框架。

### 插件

可以参考 `egg-ts-helper` 自动生成的格式：

```typescript
// {plugin_root}/index.d.ts

import 'egg';
import News from '../../../app/service/News';

declare module 'egg' {
  // 扩展 service
  interface IService {
    news: News;
  }

  // 扩展 app
  interface Application {}

  // 扩展 context
  interface Context {}

  // 扩展你的配置
  interface EggAppConfig {}

  // 扩展自定义环境
  type EggEnvType = 'local' | 'unittest' | 'prod' | 'sit';
}
```

### 上层框架

定义：

```typescript
// {framework_root}/index.d.ts

import * as Egg from 'egg';

// 将该上层框架用到的插件 import 进来
import 'my-plugin';

declare module 'egg' {
  // 跟插件一样扩展 egg ...
}

// 将 `Egg` 整个 export 出去
export = Egg;
```

开发者使用的时候，可以直接 import 你的框架：

```typescript
// app/service/news.ts

// 开发者引入你的框架，也可以使用到提示到所有 `Egg` 的提示
import { Service } from 'duck-egg';

export default class NewsService extends Service {
  public async list(page?: number): Promise<NewsItem[]> {
    return [];
  }
}
```
## 常见问题

汇集了一些人们频繁提问的 `issue` 问题，并给出了统一的解答。

### 运行 `npm start` 不会加载 `ts`

运行 `npm start` 实际上是执行了 `egg-scripts start` 命令，而 `ts-node` 只在 `egg-bin` 中被集成，只有使用 `egg-bin` 的时候，才允许直接运行 `ts` 文件。

`egg-scripts` 是在生产环境下运行 `egg` 的 `CLI` 工具。在生产环境中我们建议先将 `ts` 编译成 `js`，然后再执行，因为在线上环境中，需要考虑应用的健壮性和性能，所以不建议使用 `ts-node`。

而在开发环境中，`ts-node` 能减少 `tsc` 编译产生的文件管理成本，且在开发环境中带来的性能损耗几乎可以忽略，因此 `egg-bin` 中集成了 `ts-node`。

**总结：** 如果项目需要在线上环境运行，请先使用 `tsc` 将 `ts` 编译成 `js`（`npm run tsc`），然后再运行 `npm start`。

### 使用了 `egg` 插件后发现没有对应插件挂载的对象

出现这个问题通常有两个原因：

**1. 该 `egg` 插件未定义 `d.ts`。**

如果在插件中想要将某个对象挂载到 `egg` 的类型中，需要按照分节“插件 / 框架开发指南”补充声明文件到相应插件中。

如果想要快速上线解决这个问题，可以直接在项目下新建一个声明文件。比如使用了 `egg-dashboard` 插件，该插件在 `egg` 的 `app` 对象中挂载了 `dashboard` 对象，但插件没有提供声明，直接使用 `app.dashboard` 会导致类型错误。此时可以在项目下的 `typings` 目录中新建 `index.d.ts` 文件，并写入以下内容：

```typescript
// typings/index.d.ts

import 'egg';

declare module 'egg' {
  interface Application {
    dashboard: any;
  }
}
```

这样即可暂时解决问题，但我们更希望您能为缺少声明的插件提供 PR，以补充声明帮助更多人。

**2. `egg` 插件定义了 `d.ts` ，但未被引入。**

即使 `egg` 插件正确地定义了 `d.ts`，也需要在应用或框架层明确地引入它，`ts` 才能加载对应类型。

如果使用了 `egg-ts-helper`，它会自动根据应用中启用的插件生成显式 `import` 插件声明。如果未使用，就需要开发者在 `d.ts` 中自行显式 `import` 对应插件。

```typescript
// typings/index.d.ts

import 'egg-dashboard';
```

**注意：** 必须在 `d.ts` 中 `import`。由于 `egg` 插件大部分没有入口文件，如果在 `ts` 文件中 `import`，运行时可能出现问题。

### 在 `tsconfig.json` 中配置了 `paths` 无效

此问题严格来说并非 `egg` 特有，但常见，故在此解答。原因是当 `tsc` 将 `ts` 编译成 `js` 时，并不转换 `import` 的模块路径。因此，若您在 `tsconfig.json` 中配置了 `paths` 后，在 `ts` 中使用 `paths` 导入对应模块，编译成 `js` 后可能出现模块找不到的问题。

解决方法：不使用 `paths`；或使用 `paths` 时只导入声明，不导入具体值；或使用 [`tsconfig-paths`](https://github.com/dividab/tsconfig-paths) 动态处理。

使用 `tsconfig-paths` 时，可以直接在 `config/plugin.ts` 中引入，因为它总是最先加载的。在代码中引入该模块，见下例：

```typescript
// config/plugin.ts

import 'tsconfig-paths/register';

// 其他代码
```

### 如何为 `egg` 插件编写声明单测？

许多开发者在给 `egg` 插件提交声明时，不了解如何编写单元测试来验证声明的准确性。以下是解决方法。

在编写完 `egg` 插件的声明后，可以在 `test/fixtures` 中创建一个使用 `ts` 编写的 `egg` 应用，类似于 [https://github.com/eggjs/egg-view/tree/master/test/fixtures/apps/ts](https://github.com/eggjs/egg-view/tree/master/test/fixtures/apps/ts) 的样本，并在 `tsconfig.json` 中加入 `paths` 配置，便于在单元测试中 `import` 模块。如 `egg-view` 中配置：

```json
"paths": {
  "egg-view": ["../../../../"]
}
```

同时请勿在 `tsconfig.json` 中设置 `"skipLibCheck": true`。如果设置为 `true`，`tsc` 编译时会忽略 `d.ts` 文件中的类型检查，使单元测试失去意义。

接着添加用例验证插件声明的正确性，参考 `egg-view`：

```js
describe('typescript', () => {
  it('should compile ts without error', () => {
    return coffee
      .fork(require.resolve('typescript/bin/tsc'), [
        '-p',
        path.resolve(__dirname, './fixtures/apps/ts/tsconfig.json'),
        '--noEmit',
      ])
      // .debug()
      .expect('code', 0)
      .end();
  });
});
```

以下几个项目可作为单元测试参考：

- [https://github.com/eggjs/egg](https://github.com/eggjs/egg)
- [https://github.com/eggjs/view](https://github.com/eggjs/view)
- [https://github.com/eggjs/egg-logger](https://github.com/eggjs/egg-logger)

### 编译速度慢？

根据我们的实践，`ts-node` 是目前相对较优的解决方案，既不用另起终端执行 `tsc`，也能获得还能接受的启动速度（仅限于 `ts-node@7`，新的版本由于把文件缓存去掉了，导致特别慢（[#754](https://github.com/TypeStrong/ts-node/issues/754)），因此未升级）。

但如果项目特别庞大，`ts-node` 的性能也会吃紧，我们提供了以下优化方案供参考：

#### 关闭类型检查

编译耗时大头在类型检查。如果关闭，也能带来一定的性能提升。可以在启动应用时带上 `TS_NODE_TRANSPILE_ONLY=true` 环境变量，比如

```bash
$ TS_NODE_TRANSPILE_ONLY=true egg-bin dev
```

或者在 `package.json` 中配置 `tscompiler` 为 `ts-node` 提供的仅编译的注册器。

```json
// package.json
{
  "name": "demo",
  "egg": {
    "typescript": true,
    "declarations": true,
    "tscompiler": "ts-node/register/transpile-only"
  }
}
```

#### 更换高性能 compiler

除了 `ts-node` 之外，业界也有不少支持编译 ts 的项目，比如 `esbuild`。可以先安装 [esbuild-register](https://github.com/egoist/esbuild-register)

```bash
$ npm install esbuild-register --save-dev
```

再在 `package.json` 中配置 `tscompiler`

```json
// package.json
{
  "name": "demo",
  "egg": {
    "typescript": true,
    "declarations": true,
    "tscompiler": "esbuild-register"
  }
}
```

即可使用 `esbuild-register` 来编译（注意，`esbuild-register` 不具备 typecheck 功能）。

> 如果想用 `swc` 也一样，安装 [@swc-node/register](https://github.com/Brooooooklyn/swc-node#swc-noderegister)，然后配置到 `tscompiler` 即可。

#### 使用 `tsc`

如果还是觉得这种在运行时动态编译的速度实在无法忍受，也可以直接使用 `tsc`。即不需要在 `package.json` 中配置 `typescript` 为 `true`，在开发期间单独起个终端执行 `tsc`。

```bash
$ tsc -w
```

然后再正常启动 `egg` 应用即可。

```bash
$ egg-bin dev
```

建议在 `.gitignore` 中加上对 `**/*.js` 的配置，避免将生成的 js 代码也提交到了远端。
