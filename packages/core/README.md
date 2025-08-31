# @eggjs/core

[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/eggjs/core/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eggjs/core/actions/workflows/nodejs.yml)
[![Test coverage][codecov-image]][codecov-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/core.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/core.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/core
[codecov-image]: https://codecov.io/github/eggjs/core/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/eggjs/core?branch=master
[snyk-image]: https://snyk.io/test/npm/@eggjs/core/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/core
[download-image]: https://img.shields.io/npm/dm/@eggjs/core.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/core

A core plugin framework based on [@eggjs/koa](https://github.com/eggjs/koa).
Support Commonjs and ESM both by [tshy](https://github.com/isaacs/tshy).

**Don't use it directly, see [egg].**

## Usage

Directory structure

```bash
├── package.json
├── app.ts (optional)
├── agent.ts (optional)
├── app
|   ├── router.ts
│   ├── controller
│   │   └── home.ts
|   ├── extend (optional)
│   |   ├── helper.ts (optional)
│   |   ├── filter.ts (optional)
│   |   ├── request.ts (optional)
│   |   ├── response.ts (optional)
│   |   ├── context.ts (optional)
│   |   ├── application.ts (optional)
│   |   └── agent.ts (optional)
│   ├── service (optional)
│   ├── middleware (optional)
│   │   └── response_time.ts
│   └── view (optional)
|       ├── layout.html
│       └── home.html
├── config
|   ├── config.default.ts
│   ├── config.prod.ts
|   ├── config.test.ts (optional)
|   ├── config.local.ts (optional)
|   ├── config.unittest.ts (optional)
│   └── plugin.ts
```

Then you can start with code below

```ts
import { EggCore as Application } from '@eggjs/core';

const app = new Application({
  baseDir: '/path/to/app',
});
app.ready(() => {
  app.listen(3000);
});
```

## EggLoader

EggLoader can easily load files or directories in your [egg] project.
In addition, you can customize the loader with low level APIs.

### constructor

- {String} baseDir - current directory of application
- {Object} app - instance of egg application
- {Object} plugins - merge plugins for test
- {Logger} logger - logger instance，default is console

### High Level APIs

#### async loadPlugin

Load config/plugin.ts

#### async loadConfig

Load config/config.ts and config/{serverEnv}.ts

If `process.env.EGG_APP_CONFIG` is exists, then it will be parse and override config.

#### async loadController

Load app/controller

#### async loadMiddleware

Load app/middleware

#### async loadApplicationExtend

Load app/extend/application.ts

#### async loadContextExtend

Load app/extend/context.ts

#### async loadRequestExtend

Load app/extend/request.ts

#### async loadResponseExtend

Load app/extend/response.ts

#### async loadHelperExtend

Load app/extend/helper.ts

#### async loadCustomApp

Load app.ts, if app.ts export boot class, then trigger configDidLoad

#### async loadCustomAgent

Load agent.ts, if agent.ts export boot class, then trigger configDidLoad

#### async loadService

Load app/service

### Low Level APIs

#### getServerEnv()

Retrieve application environment variable values via `serverEnv`.
You can access directly by calling `this.serverEnv` after instantiation.

| serverEnv | description                            |
| --------- | -------------------------------------- |
| default   | default environment                    |
| test      | system integration testing environment |
| prod      | production environment                 |
| local     | local environment on your own computer |
| unittest  | unit test environment                  |

#### getEggPaths()

To get directories of the frameworks. A new framework is created by extending egg,
then you can use this function to get all frameworks.

#### getLoadUnits()

A loadUnit is a directory that can be loaded by EggLoader, cause it has the same structure.

This function will get add loadUnits follow the order:

1. plugin
2. framework
3. app

loadUnit has a path and a type. Type must be one of those values: _app_, _framework_, _plugin_.

```js
{
  path: 'path/to/application',
  type: 'app'
}
```

#### getAppname()

To get application name from _package.json_

#### appInfo

Get the infomation of the application

- pkg: `package.json`
- name: the application name from `package.json`
- baseDir: current directory of application
- env: equals to serverEnv
- HOME: home directory of the OS
- root: baseDir when local and unittest, HOME when other environment

#### async loadFile(filepath)

To load a single file. **Note:** The file must export as a function.

#### async loadToApp(directory, property, LoaderOptions)

To load files from directory in the application.

Invoke `this.loadToApp('$baseDir/app/controller', 'controller')`, then you can use it by `app.controller`.

#### async loadToContext(directory, property, LoaderOptions)

To load files from directory, and it will be bound the context.

```ts
// define service in app/service/query.ts
export default class Query {
  constructor(ctx: Context) {
    super(ctx);
    // get the ctx
  }

  async get() {}
}

// use the service in app/controller/home.ts
export default async (ctx: Context) => {
  ctx.body = await ctx.service.query.get();
};
```

#### async loadExtend(name, target)

Loader app/extend/xx.ts to target, For example,

```ts
await this.loadExtend('application', app);
```

### LoaderOptions

| Param       | Type              | Description                                                                                                                                                        |
| ----------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| directory   | `String/Array`    | directories to be loaded                                                                                                                                           |
| target      | `Object`          | attach the target object from loaded files                                                                                                                         |
| match       | `String/Array`    | match the files when load, default to `**/*.js`(if process.env.EGG\*TYPESCRIPT was true, default to `[ '\*\*/\_.(js                                                | ts)', '!\*_/_.d.ts' ]`) |
| ignore      | `String/Array`    | ignore the files when load                                                                                                                                         |
| initializer | `Function`        | custom file exports, receive two parameters, first is the inject object(if not js file, will be content buffer), second is an `options` object that contain `path` |
| caseStyle   | `String/Function` | set property's case when converting a filepath to property list.                                                                                                   |
| override    | `Boolean`         | determine whether override the property when get the same name                                                                                                     |
| call        | `Boolean`         | determine whether invoke when exports is function                                                                                                                  |
| inject      | `Object`          | an object that be the argument when invoke the function                                                                                                            |
| filter      | `Function`        | a function that filter the exports which can be loaded                                                                                                             |

## Timing

EggCore record boot progress with `Timing`, include:

- Process start time
- Script start time(node don't implement an interface like `process.uptime` to record the script start running time, framework can implement a prestart file used with node `--require` options to set `process.scriptTime`)
- `application start` or `agent start` time
- Load duration
- `require` duration

### start

Start record a item. If the item exits, end the old one and start a new one.

- {String} name - record item name
- {Number} [start] - record item start time, default is Date.now()

### end

End a item.

- {String} name - end item name

### toJSON

Generate all record items to json

- {String} name - record item name
- {Number} start - item start time
- {Number} end - item end time
- {Number} duration - item duration
- {Number} pid - pid
- {Number} index - item index

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/core)](https://github.com/eggjs/core/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).

[egg]: https://github.com/eggjs/egg
