---
title: TypeScript
---

> [TypeScript](https://www.typescriptlang.org/) is a typed superset of JavaScript that compiles to plain JavaScript.

For a large number of enterprises' applications, TypeScript's static type checking, intellisense, friendly IDE are valuable. For more please see [System Research Report For TypeScript](https://juejin.im/post/59c46bc86fb9a00a4636f939).

However, we've met some problems influencing users' experience when developing Egg in TypeScript:

- The most outstanding Loader Mechanism (Auto-loading) makes TS not analyze dependencies in static.
- How to validate and show intellisense in `config.{env}.js`, when we modify settings by plugin and these configurations are automatically merged?
- During the period of developing, `tsc -w` is created as an independent process to build up codes, it makes us entangled about where to save the temporary files, and the complicated `npm scripts`.
- How to map to the TS source files instead of compiled js files in unit tests, coverage tests and error stacks online?

This article mainly describes:

- **Developing principles of TS for the application layer.**
- **How do we solve the problem for developers with the help of the tool chain so that they have no scene about it and keep in consistency**

For more about this tossing process, please see [[RFC] TypeScript tool support](https://github.com/eggjs/egg/issues/2272).

---

## Quick Start

A quick initialization through the boilerplate:

```bash
$ mkdir showcase && cd showcase
$ npm init egg --type=ts
$ npm i
$ npm run dev
```

The boilerplate above will create a very simple example, for a detailed one please see [eggjs/examples/hackernews-async-ts](https://github.com/eggjs/examples/tree/master/hackernews-async-ts)

![tegg.gif](https://user-images.githubusercontent.com/227713/38358019-bf7890fa-38f6-11e8-8955-ea072ac6dc8c.gif)

---

## Principles of Catalogs

**Some constraints:**

- We've no plans for re-writing Egg in TS yet.
- Egg itself, with its plugin, will have corresponding `index.d.ts` for users to use easily.
- TypeScript only belongs to a communication practice. We support it to some extent with our tool chain.
- TypeScript's version MUST BE 2.8 at least.

There's no obvious difference between TS's project and Egg's in js:

- The suffix is `ts` in `typescript` style
- `typings` folder is used to put `d.ts` files (most of them are automatically created)

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

// Your own middleware here
export default function fooMiddleware() {
  return async (ctx: Context, next: any) => {
    // Get configs like this：
    // const config = ctx.app.config;
    // config.xxx....
    await next();
  };
}
```

When some property's name in config matches your middleware files's, Egg will automatically read out all of its sub properties.

Let's assume you've got a middleware named `uuid`, and its config.default.js is:

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

In `uuid` middleware:

```typescript
// app/middleware/uuid.ts

import { Context, Application, EggAppConfig } from 'egg';

export default function uuid(
  options: EggAppConfig['uuid'],
  app: Application,
): any {
  return async (ctx: Context, next: () => Promise<any>) => {
    // The 'name' is just the sub prop in uuid in the config.default.js
    console.info(options.name);
    await next();
  };
}
```

**Notice: The return value of any middleware must be `any` now, otherwise there's a compiling error about the compatibility of context between Koa's context in route.get/all and Egg's Context.**

### Extend

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

### Config

Config is a little complicated, because it supports:

- In Controller and Service, we need "multi-layer" intellisense configurations, they are automatically related to each other.
- In Config, `config.view = {}` will also support intellisense.
- In `config.{env}.ts`, we can use customized configuration settings with intellisense in `config.default.ts`.

```typescript
// app/config/config.default.ts
import { EggAppInfo, EggAppConfig, PowerPartial } from 'egg';

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  // Override the configs of framework and plugins
  config.keys = appInfo.name + '123456';
  config.view = {
    defaultViewEngine: 'nunjucks',
    mapping: {
      '.tpl': 'nunjucks',
    },
  };

  // Configs of application
  const bizConfig = {};
  bizConfig.news = {
    pageSize: 30,
    serverUrl: 'https://hacker-news.firebaseio.com/v0',
  };

  // We merge the business logic's configs into AppConfig as the return value
  return {
    // If we directly return you config and merge it into EggAppConfig, there'll be a circulate type error
    ...(config as {}),
    ...bizConfig,
  };
};
```

**Notice: We need `egg-ts-helper` to merge the returned config type from `config.default.js` into egg's `EggAppConfig`.**

When `EggAppConfig` is merged with the returned type of `config.default.ts`, we can also get the intellisenses of our customized configs in `config.default.ts` like this following:

```typescript
// app/config/config.local.ts
import { EggAppConfig } from 'egg';

export default () => {
  const config = {} as PowerPartial<EggAppConfig>;
  // Now we can get the intellisenses of 'news'
  config.news = {
    pageSize: 20,
  };
  return config;
};
```

Remarks:

- `Conditional Types` is the KEY to solving config's intellisense.
- Anyone if interested in this, have a look at the implement of `PowerPartial` at [egg/index.d.ts](https://github.com/eggjs/egg/blob/master/index.d.ts).

```typescript
// {egg}/index.d.ts
type PowerPartial<T> = {
  [U in keyof T]?: T[U] extends {} ? PowerPartial<T[U]> : T[U];
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

### Lifecycle

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

### Typings

The folder is the principle of TS, where `**/*.d.ts` are automatically recognized.

- Put developers' hand-writing suggestions in `typings/index.d.ts`.
- Tools will automatically generate `typings/{app,config}/**.d.ts`. Please DO NOT change manually (See below).

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

Due to the automatic loading mechanism, TS cannot analyze dependencies in static or relationship intellisense.

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

The corresponding `d.ts` files are automatically generated in `typings/{app,config}/` during the developing period. **DO NOT modify manually in case of being overwritten**.

The tool nowadays can support egg projects in ts and js with intellisenses.

### Unit Test and Cov

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

### Debug

There's no main difference for debugging in TS, it can reach correct positions through `sourcemap`.

```json
{
  "name": "showcase",
  "egg": {
    "declarations": true
  },
  "scripts": {
    "debug": "egg-bin debug",
    "debug-test": "npm run test-local -- --inspect"
  }
}
```

- [Debugging in VSCode](https://eggjs.org/zh-cn/core/development.html#%E4%BD%BF%E7%94%A8-vscode-%E8%BF%9B%E8%A1%8C%E8%B0%83%E8%AF%95)
- [History of Debugging Egg in VSCode](https://github.com/atian25/blog/issues/25)

---

## Deployment

### Building

- In a PROD env, we tend to build ts to js, and recommend to build on `ci` and make packages.

Configs in `package.json` :

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
  "exclude": ["app/public", "app/web", "app/views"]
}
```

**Notice: When ts and js files are with the same name, egg will first load js ones. So during the development period, `egg-ts-helper` will be automatically called to clear up all the js files with the same names, of course you can use `npm run clean` to clear them manually.**

### Error Stacks

Codes online are js after compilation, however what we expect is to see error stacks pointing at TS source codes. So:

- When buiding the project, we should insert info of `sourcemap` in `inlineSourceMap: true`.
- For developers, there's no need to worry about correcting the positions to the right error stacks in a built-in `egg-scripts`.

For more detailed info:

- [https://zhuanlan.zhihu.com/p/26267678](https://zhuanlan.zhihu.com/p/26267678)
- [https://github.com/eggjs/egg-scripts/pull/19](https://github.com/eggjs/egg-scripts/pull/19)

---

## Guides to the Developments of Plugin/Framework

**Principles:**

- DO NOT recommend to develop plugin/framework in TS directly, we should publish them in js to npm.
- When you write a plugin/framework, the corresponding `index.d.ts` should be included.
- By [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) we can inject the functions of plugin/framework into Egg.
- All are mounted on `egg` module, DO NOT use the outer layer.

### Plugin

Styles can be referred from the automatically generated `egg-ts-helper`:

```typescript
// {plugin_root}/index.d.ts

import 'egg';
import News from '../../../app/service/News';

declare module 'egg' {
  // extended service
  interface IService {
    news: News;
  }

  // extended app
  interface Application {}

  // extended context
  interface Context {}

  // extended your own configs
  interface EggAppConfig {}

  // extend customize env
  type EggEnvType = 'local' | 'unittest' | 'prod' | 'sit';
}
```

### The Outer Framework

Definitions:

```typescript
// {framework_root}/index.d.ts

import * as Egg from 'egg';

// With 'import' to include the outer framework's plugin.
import 'my-plugin';

declare module 'egg' {
  // Extend egg like plugin...
}

// Export the whole Egg
export = Egg;
```

For developers, they can directly import your framework:

```typescript
// app/service/news.ts

// Developers can get all intellisense after they import your framework
import { Service } from 'duck-egg';

export default class NewsService extends Service {
  public async list(page?: number): Promise<NewsItem[]> {
    return [];
  }
}
```

## Frequently-asked questions

Here're some questions asked by many people with answers one by one:

### `ts` won't be loaded when running `npm start`

`npm start` actually runs `egg-scripts start`, however we ONLY integrate `ts-node` in our `egg-bin`, it means ts won'be loaded until we use `egg-bin`.

`egg-scripts` is the cli for PROD, and we suggest you compiling all the ts to js before running because of robustness and capbility. That's the reason why we don't suggest you using `ts-node` to run the application in PROD.

On the contrary, `ts-node` can reduce the cost of management for compiled files from `tsc`in DEV, and the performance loss can almost be ignored, so `ts-node` is integrated into `egg-bin`.

**In summary: Please use `tsc`to compile all ts files into js through `npm run tsc`, and then run `npm start`.**

### There's no loaded objects when using egg's plugin

There're mainly two reasons causing this problem:

**1. No related defination `d.ts` file for the plugin**

If you want to load some object into egg, you MUST follow the `Plugin / Framework Development Instructions` below by making a declaration file into your own plugin.

You can also create a new declaration file to solve this problem when you are eager to deploy to PROD. Suppose I'm using the plugin of `egg-dashboard` and it has a loading object in egg's app without any declarations, so if you directly use `app.dashboard`, there'll be a type error occuring, and you want to solve it eagerly, you can create `index.d.ts` in 'typings' by writing this following:

```typescript
// typings/index.d.ts

import 'egg';

declare module 'egg' {
  interface Application {
    dashboard: any;
  }
}
```

Now it's solved! Of course your PRs for plugins without declaration files are welcomed to help others!

**2. egg's plugin has the declaration but not loaded**

If the egg's plugin has the right declaration, we need to import it exclipitly and ts can load the related object.

If you use `egg-ts-helper`, it will automatically generate the exclipit importing declarations according to what plugins you've enabled in the application. If you don't use that, you have to import the declaration of plugins manually.

```typescript
// typings/index.d.ts

import 'egg-dashboard';
```

**Notice: You MUST use 'import' in `d.ts`, because most of egg's plugins are without main entry points. There'll be errors occuring if you import directly in ts.**

### `paths` is invalid in `tsconfig.json`

Strictly speaking, this has nothing to do with egg but with many people's questions, and we'll give our answer to it. The reason is `tsc` WON'T convert the import path when compiling ts to js, so when you config `paths` in `tsconfig.json` and if you use `paths` to import the related modules, you are running the high risk that you cannot find them when compiled to js.

The solution is either you don't use `paths`, or you can ONLY import some declarations instead of detailed values. Another way is that you can use [tsconfig-paths](https://github.com/dividab/tsconfig-paths) to hook the process logic in node's path module to support `paths` in `tsconfig.json`.

You can directly import `tsconfig-paths` in `config/plugin.ts`, because `plugin.ts` is ALWAYS loaded firstly in both App and Agent.

```typescript
// config/plugin.ts

import 'tsconfig-paths/register';

...
```

### How to write unit tests for declarations of egg's plugins?

Many contributors don't know how to write unit tests for their plugin's declaration files, so we also have a discussion about it here:

When you finish writing a declaration for an egg's plugin, you can write your own application in `test/fixures` (you can refer [https://github.com/eggjs/egg-view/tree/master/test/fixtures/apps/ts](https://github.com/eggjs/egg-view/tree/master/test/fixtures/apps/ts)). Do remember to add `paths`configs into `tsconfig.json` to do imports in the fixture. Take `egg-view` as an example:

```json
    "paths": {
      "egg-view": ["../../../../"]
    }
```

Do remember DO NOT CONFIG `"skipLibCheck": true` in the `tsconfig.json`, and if you set it to true, `tsc`will ignore the type checks when compiling, and there's no meaning for unit tests for your plugin's declarations.

In the end, add a test case to check whether your declaration works properly or not. See `egg-view` example below:

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

Some other unit test projects as your references:

- [https://github.com/eggjs/egg](https://github.com/eggjs/egg)
- [https://github.com/eggjs/egg-view](https://github.com/eggjs/egg-view)
- [https://github.com/eggjs/egg-logger](https://github.com/eggjs/egg-logger)

### Slow Compilation?

According to our practice, ts-node is a better solution nowaday because we don't execute
tsc in a new terminal, and we can accept the start speed (only for ts-node@7, because the
new version has removed the cache and it makes the speed too slow ([#754](https://github.com/TypeStrong/ts-node/issues/754)), so that's why we don't upgrade it).

But if your project is extreamly huge, ts-node's performance will be tight as well.
So here're our optimizations for you:

#### Close typecheck

Most of time in compilation is type checking, so if we close it there'll be
a bit improvements for performance, with the environment variable
`TS_NODE_TRANSPILE_ONLY=true` when starting your app. E.g:

```bash
$ TS_NODE_TRANSPILE_ONLY=true egg-bin dev
```

Or you can just make tscompiler as the "Compiling-Only" for tscompiler.

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

#### Switch for a high efficient compiler

Besides ts-node, There're also many projects supporting ts compilation,
such as esbuild, we can install it first [esbuild-register](https://github.com/egoist/esbuild-register)

```bash
$ npm install esbuild-register --save-dev
```

And then config `tscompiler` like this:

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

Then you can use esbuild-register to compile (notice: esbulild-register can't
do typecheck).

> Same for swc, if you want to use it after installation [@swc-node/register](https://github.com/Brooooooklyn/swc-node#swc-noderegister), and then config in tscompiler.

#### Use tsc

If you still cannot bear the speed of the dynamic compilation, you can directly
use tsc. This means you don't need to config typescript to true in package.json,
but just start a new terminal to execute tsc.

```bash
$ tsc -w
```

And then start the egg.

```bash
$ egg-bin dev
```

We suggest you can add configs for `**/*.js` at .gitignore to avoid
submitting the generated js files to the remote.
