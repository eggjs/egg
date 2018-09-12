title: TypeScript
---

> [TypeScript](https://www.typescriptlang.org/) is a typed superset of JavaScript that compiles to plain JavaScript.

For a large number of enterprises' applications, TypeScript's static type checking, intellisenses, friendly IDE are valuable. For more please see [System Research Report For TypeScript](https://juejin.im/post/59c46bc86fb9a00a4636f939) 。

However, we've met some problems influencing users' experience when developing Egg in TypeScript: 

* The most outstanding Loader Mechanism (Auto-loading) makes TS not analyze dependencies in static.
* How to validate and show intellisenses in `config.{env}.js`, when we modify settings by plug-in and these configurations are automatically merged? 
* During the period of developing, `tsc -w` is created as an independent process to build up codes, it makes us entangled about where to save the temporary files, and the complicated `npm scripts`.
* How to map to the TS source files instead of compiled js files in unit tests, coverage tests and error stacks online?

This article mainly describes:

* **Developing principles of TS for the application layer.**
* **How do we solve the problem for developers with the help of the tool chain so that they  have no scene about it and keep in consistency**

For more about this tossing process, please see [[RFC] TypeScript tool support](https://github.com/eggjs/egg/issues/2272)

---

## Quick Start
Be a quick initialization through the boilerplate:

```bash
$ npx egg-init --type=ts showcase
$ cd showcase && npm i
$ npm run dev
```

The boilerplate above will create a very simple example, for a detailed one please see[eggjs/examples/hackernews-async-ts](https://github.com/eggjs/examples/tree/master/hackernews-async-ts)

![tegg.gif](https://user-images.githubusercontent.com/227713/38358019-bf7890fa-38f6-11e8-8955-ea072ac6dc8c.gif)

---

## Principles of catalogs

**Some constraints:**

* We've no plans for re-writing Egg in TS yet.
* Egg itself, with its plug-in, will have corresponding `index.d.ts` for users to use easily.
* TypeScript only belongs to a communication practice. We support it to some extent with our tool chain.
* TypeScript's version MUST BE 2.8 at least.

There's no obvious difference between TS's project and Egg's in js:

* The suffix is `ts` in `typescript` style
* `typings` folder is used to put `d.ts` files (most of them are automatically created)

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

`Middlewares` support input parameters, and the first one is the `config` of the same name. If you have other requirements, a full version is needed:

```typescript
// app/middleware/news.ts

import { Context, Application } from 'egg';
import { BizConfig } from '../../config/config.default';

// We must use ['news'] instead of '.news', because 'BizConfig' is a type instead of instance
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

`Config` is a little complicated, because it supports:

* In Controller, Service we need "multi-layer" intellisense configurations, they are automatically related to each other.
* In Config, `config.view = {}` will also support intellisenses.
* In `config.{env}.ts`, we can use customized configuration settings with intellisenses in `config.default.ts`.

```typescript
// app/config/config.default.ts
import { EggAppInfo, EggAppConfig, PowerPartial } from 'egg';

// For config.{env}.ts
export type DefaultConfig = PowerPartial<EggAppConfig & BizConfig>;

// Config of App's Scheme
export interface BizConfig {
  news: {
    pageSize: number;
    serverUrl: string;
  };
}

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig> & BizConfig;

  // Override the framework, plug-in's configurations
  config.keys = appInfo.name + '123456';
  config.view = {
    defaultViewEngine: 'nunjucks',
    mapping: {
      '.tpl': 'nunjucks',
    },
  };

  // Configs of App itself
  config.news = {
    pageSize: 30,
    serverUrl: 'https://hacker-news.firebaseio.com/v0',
  };

  return config;
};
```

Simplified Version:

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

Remarks:

* `Conditional Types` is the KEY to solving config's intellisenses.
* Anyone if interested in this, have a look at the implement of `PowerPartial` at [egg/index.d.ts](https://github.com/eggjs/egg/blob/master/index.d.ts).

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

The folder is the principle of TS, where `**/*.d.ts` are automatically recognized.

* Put developers' hand-writing suggestions in `typings/index.d.ts`.
* Tools will automatically generate `typings/{app,config}/**.d.ts`. Please DO NOT change manually (See below).

---

## Developing period

### ts-node

`egg-bin` has built [ts-node](https://github.com/TypeStrong/ts-node) in, and `egg loader` will automatically load `*.ts` and compile them in memory during the period of development.

Now `dev` / `debug` / `test` / `cov` are supported.

Developers only need to config in `package.json` simply:

```json
{
  "name": "showcase",
  "egg": {
    "typescript": true
  }
}
```

### egg-ts-helper

Due to the automatic loading mechanism, TS cannot analyze dependencies in static or relationship intellisenses.

Luckily, TS has many tricks to cope with it. We can use [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) to write `d.ts` as a helper.

E.g: `app/service/news.ts` will automatically load `ctx.service.news` and recognize it, if you write like this below: 

```typescript
// typings/app/service/index.d.ts
import News from '../../../app/service/News';

declare module 'egg' {
  interface IService {
    news: News;
  }
}
```

It's a bit too bothering to write them manually, so we offer you a tool [egg-ts-helper](https://github.com/whxaxes/egg-ts-helper), with which we can analyze and generate `d.ts` files automatically.

What we do is just to do some configs in `package.json`:

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

The corresponding `d.ts` files are automatically generated in `typings/{app,config}/` during the developing period. **DO NOT modify manually in case of being overwritten**.

> In the future, the tool will also support the analysis of Egg in js, which will improve the experience of js development.

### Unit Test && Cov

Unit Test is a MUST in development:

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

Run commands as what you do before, and we've built `Error stacks and coverages` in.

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

There's no main difference for debugging in TS, it can reach correct positions through `sourcemap`.

```json
{
  "name": "showcase",
  "scripts": {
    "debug": "egg-bin debug -r egg-ts-helper/register",
    "debug-test": "npm run test-local -- --inspect"
  }
}
```

* [Debugging in VSCode](https://eggjs.org/zh-cn/core/development.html#%E4%BD%BF%E7%94%A8-vscode-%E8%BF%9B%E8%A1%8C%E8%B0%83%E8%AF%95)
* [History of Debugging Egg in VSCode](https://github.com/atian25/blog/issues/25)

---

## Deployment

### Building

* In a PROD env, we tend to build ts to js, and recommend to build on `ci` and make packages.

Configs in `package.json` :

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

And the corresponding `tsconfig.json`:

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

**Notice: When ts and js files are with the same name, egg will first load js ones. So during the development period, `egg-ts-helper` will be automatically called to clear up all the js files with the same names, of course you can use `npm run clean` to clear them manually.**

### Error Stacks

Codes online are js after compilation, however what we expect is to see error stacks pointing at TS source codes. So:

* When buiding the project, we should insert info of `sourcemap` in `inlineSourceMap: true`.
* For developers, there's no need to worry about correcting the positions to the right error stacks in a built-in `egg-scripts`.

For more detailed info:

* [https://zhuanlan.zhihu.com/p/26267678](https://zhuanlan.zhihu.com/p/26267678)
* [https://github.com/eggjs/egg-scripts/pull/19](https://github.com/eggjs/egg-scripts/pull/19)

---

## Guides to the developments of Plug-in/Framework

**Principles:**

* DO NOT recommend to develop plug-in/framework in TS directly, we should publish them in js to npm.
* When you write a plug-in/framework, the corresponding `index.d.ts` should be included.
* By [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) we can inject the functions of plug-in/framework into Egg.
* All are mounted on `egg` module, DO NOT use the outer layer.

### Plug-in

Styles can be referred from the automatically generated `egg-ts-helper`:

```typescript
// {plugin_root}/index.d.ts

import News from '../../../app/service/News';

declare module 'egg' {

  // extended service
  interface IService {
    news: News;
  }

  // extended app
  interface Application {

  }

  // extended context
  interface Context {

  }

  // extended your own configs
  interface EggAppConfig {

  }

  // extend customize env
  type EggEnvType = 'local' | 'unittest' | 'prod' | 'sit';
}
```

### The outer framework

Definitions:

```typescript
// {framework_root}/index.d.ts

import * as Egg from 'egg';

// With 'import' to include the outer framework's plug-in.
import 'my-plugin';

declare module 'egg' {
  // Extend egg like plug-in...
}

// Export the whole Egg
export = Egg;
```

For developers, they can directly import your framework:

```typescript
// app/service/news.ts

// Developers can get all intellisenses after they import your framework
import { Service } from 'duck-egg';

export default class NewsService extends Service {
  public async list(page?: number): Promise<NewsItem[]> {
    return [];
  }
}
```