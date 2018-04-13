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
* TypeScript 最低要求 2.8+ 版本。

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

### Controller

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

### Router

```typescript
// app/router.ts
import { Application } from 'egg';

export default (app: Application) => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
};
```

### Service

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

### Middleware

```typescript
// app/middleware/robot.ts

import { Context } from 'egg';

export default function robotMiddleware() {
  return async (ctx: Context, next: any) => {
    await next();
  };
}
```

因为 Middleware 定义是支持入参的，第一个参数为同名的 Config，如有需求，可以用完整版：

```typescript
// app/middleware/news.ts

import { Context, Application } from 'egg';
import { BizConfig } from '../../config/config.default';

// 注意，这里必须要用 ['news'] 而不能用 .news，因为 BizConfig 是 type，不是实例
export default function newsMiddleware(options: BizConfig['news'], app: Application) {
  return async (ctx: Context, next: () => Promise<any>) => {
    console.info(options.serverUrl);
    await next();
  };
}
```

### Extend

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

### Config

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

### Plugin

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

### Typings

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

```javascript
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

### Unit Test && Cov

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

### Debug

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

## 部署

### 构建

* 正式环境下，我们更倾向于把 ts 构建为 js ，建议在 `ci` 上构建并打包。

配置 `package.json` :

```json
{
  "egg": {
    "typescript": true
  }，
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

**注意：**

* **当有同名的 ts 和 js 文件时，egg 会优先加载 js 文件。**
* 因此在开发期， `egg-ts-helper` 会自动调用清除同名的 `js` 文件，也可 `npm run clean` 手动清除。

### 错误堆栈

线上服务的代码是经过编译后的 js，而我们期望看到的错误堆栈是指向 TS 源码。
因此：

* 在构建的时候，需配置 `inlineSourceMap: true` 在 js 底部插入 sourcemap 信息。
* 在 `egg-scripts` 内建了处理，会自动纠正为正确的错误堆栈，应用开发者无需担心。

具体内幕参见：

* [https://zhuanlan.zhihu.com/p/26267678](https://zhuanlan.zhihu.com/p/26267678)
* [https://github.com/eggjs/egg-scripts/pull/19](https://github.com/eggjs/egg-scripts/pull/19)

---

## 插件/框架开发指南

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