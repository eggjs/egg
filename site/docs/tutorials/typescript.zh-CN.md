---
title: TypeScript
---

> [TypeScript](https://www.typescriptlang.org/) 是 JavaScript 类型的超集，它可以编译成纯 JavaScript。

TypeScript 的静态类型检查，智能提示，IDE 友好性等特性，对于大规模企业级应用，是非常的有价值的。详见：[TypeScript 体系调研报告](https://juejin.im/post/59c46bc86fb9a00a4636f939) 。

然而，此前使用 TypeScript 开发 Egg ，会遇到一些影响 **开发者体验** 问题：

- Egg 最精髓的 Loader 自动加载机制，导致 TS 无法静态分析出部分依赖。
- Config 自动合并机制下，如何在 `config.{env}.js` 里面修改插件提供的配置时，能校验并智能提示？
- 开发期需要独立开一个 `tsc -w` 独立进程来构建代码，带来临时文件位置纠结以及 `npm scripts` 复杂化。
- 单元测试，覆盖率测试，线上错误堆栈如何指向 TS 源文件，而不是编译后的 js 文件。

本文主要阐述：

- **应用层 TS 开发规范**
- **我们在工具链方面的支持，是如何来解决上述问题，让开发者几乎无感知并保持一致性。**

具体的折腾过程参见：[[RFC] TypeScript tool support](https://github.com/eggjs/egg/issues/2272)

---

## 快速入门

通过骨架快速初始化：

```bash
$ mkdir showcase && cd showcase
$ npm init egg --type=ts
$ npm i
$ npm run dev
```

上述骨架会生成一个极简版的示例，更完整的示例参见：[eggjs/examples/hackernews-async-ts](https://github.com/eggjs/examples/tree/master/hackernews-async-ts)

![tegg.gif](https://user-images.githubusercontent.com/227713/38358019-bf7890fa-38f6-11e8-8955-ea072ac6dc8c.gif)

---

## 目录规范

**一些约束：**

- Egg 目前没有计划使用 TS 重写。
- Egg 以及它对应的插件，会提供对应的 `index.d.ts` 文件方便开发者使用。
- TypeScript 只是其中一种社区实践，我们通过工具链给予一定程度的支持。
- TypeScript 最低要求：版本 2.8。

整体目录结构上跟 Egg 普通项目没啥区别:

- `typescript` 代码风格，后缀名为 `ts`
- `typings` 目录用于放置 `d.ts` 文件（大部分会自动生成）

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

// 这里是你自定义的中间件
export default function fooMiddleware(): any {
  return async (ctx: Context, next: () => Promise<any>) => {
    // 你可以获取 config 的配置：
    // const config = ctx.app.config;
    // config.xxx....
    await next();
  };
}
```

当某个 Middleware 文件的名称与 config 中某个属性名一致时，Middleware 会自动把这个属性下的所有配置读取过来。

我们假定你有一个 Middleware，名称是 uuid，其 config.default.js 中配置如下：

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

在对应的 uuid 中间件中：

```typescript
// app/middleware/uuid.ts

import { Context, Application, EggAppConfig } from 'egg';

export default function uuidMiddleWare(
  options: EggAppConfig['uuid'],
  app: Application,
): any {
  return async (ctx: Context, next: () => Promise<any>) => {
    // name 就是 config.default.js 中 uuid 下的属性
    console.info(options.name);
    await next();
  };
}
```

**注意：Middleware 目前返回值必须都是 `any`，否则使用 route.get/all 等方法的时候因为 Koa 的 `IRouteContext` 和 Egg 自身的 `Context` 不兼容导致编译报错。**

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

`Config` 这块稍微有点复杂，因为要支持：

- 在 Controller，Service 那边使用配置，需支持多级提示，并自动关联。
- Config 内部， `config.view = {}` 的写法，也应该支持提示。
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
    },
  };

  // 应用本身的配置
  const bizConfig = {};
  bizConfig.news = {
    pageSize: 30,
    serverUrl: 'https://hacker-news.firebaseio.com/v0',
  };

  // 目的是将业务配置属性合并到 EggAppConfig 中返回
  return {
    // 如果直接返回 config ，将该类型合并到 EggAppConfig 的时候可能会出现 circulate type 错误。
    ...(config as {}),
    ...bizConfig,
  };
};
```

**注意，上面这种写法，将 config.default.ts 中返回的配置类型合并到 egg 的 EggAppConfig 类型中需要 egg-ts-helper 的配合。**

当 EggAppConfig 合并 config.default.ts 的类型后，在其他 config.{env}.ts 中这么写就也可以获得在 config.default.ts 定义的自定义配置的智能提示：

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
- 有兴趣的可以看下 [egg/index.d.ts](https://github.com/eggjs/egg/blob/master/index.d.ts) 里面的 `PowerPartial` 实现。

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
    // Ready to call configDidLoad,
    // Config, plugin files are referred,
    // this is the last chance to modify the config.
  }

  configDidLoad() {
    // Config, plugin files have loaded.
  }

  async didLoad() {
    // All files have loaded, start plugin here.
  }

  async willReady() {
    // All plugins have started, can do some thing before app ready.
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
```

### TS 类型定义（Typings）

该目录为 TS 的规范，在里面的 `**/*.d.ts` 文件将被自动识别。

- 开发者需要手写的建议放在 `typings/index.d.ts` 中。
- 工具会自动生成 `typings/{app,config}/**.d.ts` ，请勿自行修改，避免被覆盖。（见下文）

---

## 开发期

### ts-node

`egg-bin` 已经内建了 [ts-node](https://github.com/TypeStrong/ts-node) ，`egg loader` 在开发期会自动加载 `*.ts` 并内存编译。

目前已支持 `dev` / `debug` / `test` / `cov` 。

开发者仅需简单配置下 `package.json` ：

```json
{
  "name": "showcase",
  "egg": {
    "typescript": true
  }
}
```

### egg-ts-helper

由于 Egg 的自动加载机制，导致 TS 无法静态分析依赖，关联提示。

幸亏 TS 黑魔法比较多，我们可以通过 TS 的 [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) 编写 `d.ts` 来辅助。

譬如 `app/service/news.ts` 会自动挂载为 `ctx.service.news` ，通过如下写法即识别到：

```typescript
// typings/app/service/index.d.ts
import News from '../../../app/service/News';

declare module 'egg' {
  interface IService {
    news: News;
  }
}
```

手动写这些文件，未免有点繁琐，因此我们提供了 [egg-ts-helper](https://github.com/whxaxes/egg-ts-helper) 工具来自动分析源码生成对应的 `d.ts` 文件。

只需配置下 `package.json` :

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

开发期将自动生成对应的 `d.ts` 到 `typings/{app,config}/` 下，**请勿自行修改，避免被覆盖**。

目前该工具已经能支持 ts 以及 js 的 egg 项目，均能获得相应的智能提示。

### 单元测试和覆盖率（Unit Test and Cov）

单元测试当然少不了：

```typescript
// test/app/service/news.test.ts
import * as assert from 'assert';
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

运行命令也跟之前一样，并内置了 `错误堆栈和覆盖率` 的支持：

```json
{
  "name": "showcase",
  "egg": {
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

断点调试跟之前也没啥区别，会自动通过 `sourcemap` 断点到正确的位置。

```json
{
  "name": "showcase",
  "egg": {
    "declarations": true
  },
  "scripts": {
    "debug": "egg-bin debug",
    "debug-test": "npm run test-local"
  }
}
```

- [使用 VSCode 进行调试](https://eggjs.org/zh-cn/core/development.html#%E4%BD%BF%E7%94%A8-vscode-%E8%BF%9B%E8%A1%8C%E8%B0%83%E8%AF%95)
- [VSCode 调试 Egg 完美版 - 进化史](https://github.com/atian25/blog/issues/25)

---

## 部署（Deploy）

### 构建（Build）

- 正式环境下，我们更倾向于把 ts 构建为 js ，建议在 `ci` 上构建并打包。

配置 `package.json` :

```json
{
  "egg": {
    "typescript": true
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

对应的 `tsconfig.json` :

```json
{
  "compileOnSave": true,
  "compilerOptions": {
    "target": "es2017",
    "module": "commonjs",
    "strict": true,
    "noImplicitAny": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "charset": "utf8",
    "allowJs": false,
    "pretty": true,
    "noEmitOnError": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "strictPropertyInitialization": false,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "inlineSourceMap": true,
    "importHelpers": true
  },
  "exclude": ["app/public", "app/web", "app/views"]
}
```

**注意：当有同名的 ts 和 js 文件时，egg 会优先加载 js 文件。因此在开发期，`egg-ts-helper` 会自动调用清除同名的 `js` 文件，也可 `npm run clean` 手动清除。**

### 错误堆栈（Error Stack）

线上服务的代码是经过编译后的 js，而我们期望看到的错误堆栈是指向 TS 源码。
因此：

- 在构建的时候，需配置 `inlineSourceMap: true` 在 js 底部插入 sourcemap 信息。
- 在 `egg-scripts` 内建了处理，会自动纠正为正确的错误堆栈，应用开发者无需担心。

具体内幕参见：

- [https://zhuanlan.zhihu.com/p/26267678](https://zhuanlan.zhihu.com/p/26267678)
- [https://github.com/eggjs/egg-scripts/pull/19](https://github.com/eggjs/egg-scripts/pull/19)

---

## 插件 / 框架开发指南

**指导原则：**

- 不建议使用 TS 直接开发插件/框架，发布到 npm 的插件应该是 js 形式。
- 当你开发了一个插件/框架后，需要提供对应的 `index.d.ts` 。
- 通过 [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) 将插件/框架的功能注入到 Egg 中。
- 都挂载到 `egg` 这个 module，不要用上层框架。

### 插件

可以参考 `egg-ts-helper` 自动生成的格式

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
  // 跟插件一样拓展 egg ...
}

// 将 Egg 整个 export 出去
export = Egg;
```

开发者使用的时候，可以直接 import 你的框架：

```typescript
// app/service/news.ts

// 开发者引入你的框架，也可以使用到提示到所有 Egg 的提示
import { Service } from 'duck-egg';

export default class NewsService extends Service {
  public async list(page?: number): Promise<NewsItem[]> {
    return [];
  }
}
```

## 常见问题

汇集一些有不少人提过的 issue 问题并统一解答。

### 运行 npm start 不会加载 ts

npm start 运行的是 `egg-scripts start`，而我们只在 egg-bin 中集成了 ts-node，也就是只有在使用 egg-bin 的时候才允许直接运行 ts 。

egg-scripts 是用于在生产环境下运行 egg 的 cli ，在生产环境下我们建议将 ts 编译成 js 之后再运行，毕竟在线上是需要考虑应用的健壮性和性能的，因此不建议在线上环境使用 ts-node 来运行应用。

而在开发期 ts-node 能降低 tsc 编译产生的文件带来的管理成本，并且 ts-node 带来的性能损耗在开发期几乎可以忽略，所以我们在 egg-bin 集成了 ts-node。

**总结：如果项目需要在线上运行，请先使用 tsc 将 ts 编译成 js （ `npm run tsc` ）再运行 `npm start`。**

### 使用了 egg 插件后发现没有对应插件挂载的对象

遇到该问题，一般是两种原因：

**1. 该 egg 插件未定义 d.ts 。**

如果要在插件中将某个对象挂载到 egg 的类型中，需要按照上面写的 `插件 / 框架开发指南` 补充声明文件到对应插件中。

如果需要上线想快速解决这个问题，可以直接在项目下新建个声明文件来解决。比如我使用了 `egg-dashboard` 这个插件，这个插件在 egg 的 app 中挂载了个 dashboard 对象，但是这个插件没有声明，直接使用 `app.dashboard` 又会有类型错误，我又急着解决该问题，就可以在项目下的 typings 目录下新建个 `index.d.ts` ，并且写入以下内容

```typescript
// typings/index.d.ts

import 'egg';

declare module 'egg' {
  interface Application {
    dashboard: any;
  }
}
```

即可解决，当然，我们更期望你能给缺少声明的插件提 PR 补声明，方便你我他。

**2. egg 插件定义了 d.ts ，但是没有引入。**

如果 egg 插件中正确无误定义了 d.ts ，也需要在应用或者框架层显式 import 之后 ts 才能加载到对应类型。

如果使用了 egg-ts-helper ，egg-ts-helper 会自动根据应用中开启了什么插件从而生成显式 import 插件的声明。如果未使用，就需要开发者自行在 `d.ts` 中显式 import 对应插件。

```typescript
// typings/index.d.ts

import 'egg-dashboard';
```

**注意：必须在 d.ts 中 import，因为 egg 插件大部分没有入口文件，如果在 ts 中 import 的话运行会出问题。**

### 在 tsconfig.json 中配置了 paths 无效

这个严格来说不属于 egg 的问题，但是问的人不少，因此也在此解答一下。原因是 tsc 将 ts 编译成 js 的时候，并不会去转换 import 的模块路径，因此当你在 tsconfig.json 中配置了 paths 之后，如果你在 ts 中使用 paths 并 import 了对应模块，编译成 js 的时候就有大概率出现模块找不到的情况了。

解决办法是，要么不用 paths ，要么使用 paths 的时候只用来 import 一些声明而非具体值，再要么就可以使用 [tsconfig-paths](https://github.com/dividab/tsconfig-paths) 来 hook 掉 node 中的模块路径解析逻辑，从而支持 tsconfig.json 中的 paths。

使用 tsconfig-paths 可以直接在 config/plugin.ts 中引入，因为 plugin.ts 不管在 App 中还是在 Agent 中都是第一个加载的，因此在这个代码中引入 tsconfig-paths 即可。

```typescript
// config/plugin.ts

import 'tsconfig-paths/register';

...
```

### 给 egg 插件提交声明的时候如何编写单测？

由于有不少开发者在给 egg 插件提交声明的时候，不知道如何编写单测来测试声明的准确性，因此也在这里说明一下。

当给一个 egg 插件编写好声明之后，就可以在 `test/fixures` 下创建个使用 ts 写的 egg 应用，参考 （ https://github.com/eggjs/egg-view/tree/master/test/fixtures/apps/ts ），记得在 tsconfig.json 中加入 paths 的配置从而方便在 fixture 中 import ，比如 egg-view 中的

```json
    "paths": {
      "egg-view": ["../../../../"]
    }
```

同时记住不要在 tsconfig.json 中配置 `"skipLibCheck": true` ，如果配置了该属性为 true ，tsc 编译的时候会忽略 d.ts 中的类型校验，这样单测就无意义了。

然后再添加一个用例用来验证插件的声明使用是否正确即可，还是拿 egg-view 来做示例。

```js
describe('typescript', () => {
  it('should compile ts without error', () => {
    return (
      coffee
        .fork(require.resolve('typescript/bin/tsc'), [
          '-p',
          path.resolve(__dirname, './fixtures/apps/ts/tsconfig.json'),
          '--noEmit',
        ])
        // .debug()
        .expect('code', 0)
        .end()
    );
  });
});
```

可参考单测的项目：

- [https://github.com/eggjs/egg](https://github.com/eggjs/egg)
- [https://github.com/eggjs/egg-view](https://github.com/eggjs/egg-view)
- [https://github.com/eggjs/egg-logger](https://github.com/eggjs/egg-logger)

### 编译速度慢？

根据我们的实践，ts-node 是目前相对较优的解决方案，既不用另起终端执行 tsc ，也能获得还能接受的启动速度（ 仅限于 ts-node@7 ，新的版本由于把文件缓存去掉了，导致特别慢（ [#754](https://github.com/TypeStrong/ts-node/issues/754) ），因此未升级 ）。

但是如果项目特别庞大，ts-node 的性能也会吃紧，我们提供了以下优化方案供参考：

#### 关闭类型检查

编译耗时大头是在类型检查，如果关闭也能带来一定的性能提升，可以在启动应用的时候带上 `TS_NODE_TRANSPILE_ONLY=true` 环境变量，比如

```bash
$ TS_NODE_TRANSPILE_ONLY=true egg-bin dev
```

或者配置 tscompiler 为 ts-node 提供的仅编译的注册器。

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

除了 ts-node 之外，业界也有不少支持编译 ts 的项目，比如 esbuild ，可以先安装 [esbuild-register](https://github.com/egoist/esbuild-register)

```bash
$ npm install esbuild-register --save-dev
```

再在 package.json 中配置 `tscompiler`

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

即可使用 esbuild-register 来编译（ 注意，esbuild-register 不具备 typecheck 功能 ）。

> 如果想用 swc 也一样，安装一下 [@swc-node/register](https://github.com/Brooooooklyn/swc-node#swc-noderegister) ，然后一样配置到 tscompiler 即可

#### 使用 tsc

如果还是觉得这种在运行时动态编译的速度实在无法忍受，也可以直接使用 tsc ，即不需要在 package.json 中配置 typescript 为 true ，在开发期间单独起个终端执行 tsc

```bash
$ tsc -w
```

然后再正常启动 egg 应用即可

```bash
$ egg-bin dev
```

建议在 .gitignore 中加上对 `**/*.js` 的配置，避免将生成的 js 代码也提交到了远端。
