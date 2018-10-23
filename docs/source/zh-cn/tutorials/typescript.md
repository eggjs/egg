title: TypeScript
---

> [TypeScript](https://www.typescriptlang.org/) is a typed superset of JavaScript that compiles to plain JavaScript.

TypeScript 的静态类型检查，智能提示，IDE 友好性等特性，对于大规模企业级应用，是非常的有价值的。详见：[TypeScript体系调研报告](https://juejin.im/post/59c46bc86fb9a00a4636f939) 。

然而，此前使用 TypeScript 开发 Egg ，会遇到一些影响 **开发者体验** 问题：

* Egg 最精髓的 Loader 自动加载机制，导致 TS 无法静态分析出部分依赖。
* Config 自动合并机制下，如何在 `config.{env}.js` 里面修改插件提供的配置时，能校验并智能提示？
* 开发期需要独立开一个 `tsc -w` 独立进程来构建代码，带来临时文件位置纠结以及 `npm scripts` 复杂化。
* 单元测试，覆盖率测试，线上错误堆栈如何指向 TS 源文件，而不是编译后的 js 文件。

本文主要阐述：

* **应用层 TS 开发规范**
* **我们在工具链方面的支持，是如何来解决上述问题，让开发者几乎无感知并保持一致性。**

具体的折腾过程参见：[[RFC] TypeScript tool support](https://github.com/eggjs/egg/issues/2272)

---

## 快速入门

通过骨架快速初始化：

```bash
$ npx egg-init --type=ts showcase
$ cd showcase && npm i
$ npm run dev
```

上述骨架会生成一个极简版的示例，更完整的示例参见：[eggjs/examples/hackernews-async-ts](https://github.com/eggjs/examples/tree/master/hackernews-async-ts)

![tegg.gif](https://user-images.githubusercontent.com/227713/38358019-bf7890fa-38f6-11e8-8955-ea072ac6dc8c.gif)

---

## 目录规范

**一些约束：**

* Egg 目前没有计划使用 TS 重写。
* Egg 以及它对应的插件，会提供对应的 `index.d.ts` 文件方便开发者使用。
* TypeScript 只是其中一种社区实践，我们通过工具链给予一定程度的支持。
* TypeScript 最低要求：版本 2.8。

整体目录结构上跟 Egg 普通项目没啥区别:

* `typescript` 代码风格，后缀名为 `ts`
* `typings` 目录用于放置 `d.ts` 文件（大部分会自动生成）

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

export default function uuidMiddleWare(options: EggAppConfig['uuid'], app: Application): any {
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
}

// app.ts
export default app => {
  app.beforeStart(async () => {
    await Promise.resolve('egg + ts');
  });
};
```

### 配置（Config）

`Config` 这块稍微有点复杂，因为要支持：

* 在 Controller，Service 那边使用配置，需支持多级提示，并自动关联。
* Config 内部， `config.view = {}` 的写法，也应该支持提示。
* 在 `config.{env}.ts` 里可以用到 `config.default.ts` 自定义配置的提示。

```typescript
// app/config/config.default.ts
import { EggAppInfo, EggAppConfig, PowerPartial } from 'egg';

// 提供给 config.{env}.ts 使用
export type DefaultConfig = PowerPartial<EggAppConfig & BizConfig>;

// 应用本身的配置 Scheme
export interface BizConfig {
  news: {
    pageSize: number;
    serverUrl: string;
  };
}

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig> & BizConfig;

  // 覆盖框架，插件的配置
  config.keys = appInfo.name + '123456';
  config.view = {
    defaultViewEngine: 'nunjucks',
    mapping: {
      '.tpl': 'nunjucks',
    },
  };

  // 应用本身的配置
  config.news = {
    pageSize: 30,
    serverUrl: 'https://hacker-news.firebaseio.com/v0',
  };

  return config;
};
```

简单版：

```typescript
// app/config/config.local.ts
import { DefaultConfig } from './config.default';

export default () => {
  const config: DefaultConfig = {};
  config.news = {
    pageSize: 20,
  };
  return config;
};

```

备注：

* TS 的 `Conditional Types` 是我们能完美解决 Config 提示的关键。
* 有兴趣的可以看下 [egg/index.d.ts](https://github.com/eggjs/egg/blob/master/index.d.ts) 里面的 `PowerPartial` 实现。

```typescript
// {egg}/index.d.ts
type PowerPartial<T> = {
  [U in keyof T]?: T[U] extends {}
    ? PowerPartial<T[U]>
    : T[U]
};
```

### 插件（Plug-in）

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
// app/app.ts
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

* 开发者需要手写的建议放在 `typings/index.d.ts` 中。
* 工具会自动生成 `typings/{app,config}/**.d.ts` ，请勿自行修改，避免被覆盖。（见下文）

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
  "devDependencies": {
    "egg-ts-helper": "^1"
  },
  "scripts": {
    "dev": "egg-bin dev -r egg-ts-helper/register",
    "test-local": "egg-bin test -r egg-ts-helper/register",
    "clean": "ets clean"
  }
}
```

开发期将自动生成对应的 `d.ts` 到 `typings/{app,config}/` 下，**请勿自行修改，避免被覆盖**。

> 后续该工具也会考虑支持  js 版 egg 应用的分析，可以一定程度上提升 js 开发体验。

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
  "scripts": {
    "test": "npm run lint -- --fix && npm run test-local",
    "test-local": "egg-bin test -r egg-ts-helper/register",
    "cov": "egg-bin cov -r egg-ts-helper/register",
    "lint": "tslint ."
  }
}
```

### 调试（Debug）

断点调试跟之前也没啥区别，会自动通过 `sourcemap` 断点到正确的位置。

```json
{
  "name": "showcase",
  "scripts": {
    "debug": "egg-bin debug -r egg-ts-helper/register",
    "debug-test": "npm run test-local -- --inspect"
  }
}
```

* [使用 VSCode 进行调试](https://eggjs.org/zh-cn/core/development.html#%E4%BD%BF%E7%94%A8-vscode-%E8%BF%9B%E8%A1%8C%E8%B0%83%E8%AF%95)
* [VSCode 调试 Egg 完美版 - 进化史](https://github.com/atian25/blog/issues/25)

---

## 部署（Deploy）

### 构建（Build）

* 正式环境下，我们更倾向于把 ts 构建为 js ，建议在 `ci` 上构建并打包。

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
  "exclude": [
    "app/public",
    "app/web",
    "app/views"
  ]
}
```

**注意：当有同名的 ts 和 js 文件时，egg 会优先加载 js 文件。因此在开发期，`egg-ts-helper` 会自动调用清除同名的 `js` 文件，也可 `npm run clean` 手动清除。**

### 错误堆栈（Error Stack）

线上服务的代码是经过编译后的 js，而我们期望看到的错误堆栈是指向 TS 源码。
因此：

* 在构建的时候，需配置 `inlineSourceMap: true` 在 js 底部插入 sourcemap 信息。
* 在 `egg-scripts` 内建了处理，会自动纠正为正确的错误堆栈，应用开发者无需担心。

具体内幕参见：

* [https://zhuanlan.zhihu.com/p/26267678](https://zhuanlan.zhihu.com/p/26267678)
* [https://github.com/eggjs/egg-scripts/pull/19](https://github.com/eggjs/egg-scripts/pull/19)

---

## 插件 / 框架开发指南

**指导原则：**

* 不建议使用 TS 直接开发插件/框架，发布到 npm 的插件应该是 js 形式。
* 当你开发了一个插件/框架后，需要提供对应的 `index.d.ts` 。
* 通过 [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) 将插件/框架的功能注入到 Egg 中。
* 都挂载到 `egg` 这个 module，不要用上层框架。

### 插件

可以参考 `egg-ts-helper` 自动生成的格式

```typescript
// {plugin_root}/index.d.ts

import News from '../../../app/service/News';

declare module 'egg' {

  // 扩展 service
  interface IService {
    news: News;
  }

  // 扩展 app
  interface Application {

  }

  // 扩展 context
  interface Context {

  }

  // 扩展你的配置
  interface EggAppConfig {

  }

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
