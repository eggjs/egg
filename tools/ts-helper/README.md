# egg-ts-helper

[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/eggjs/egg-ts-helper/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eggjs/egg-ts-helper/actions/workflows/nodejs.yml)
[![Package Quality](http://npm.packagequality.com/shield/egg-ts-helper.svg)](http://packagequality.com/#?package=egg-ts-helper)
[![Test coverage][codecov-image]][codecov-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/egg-ts-helper.svg?style=flat-square
[npm-url]: https://npmjs.org/package/egg-ts-helper
[codecov-image]: https://codecov.io/gh/whxaxes/egg-ts-helper/branch/master/graph/badge.svg
[codecov-url]: https://codecov.io/gh/whxaxes/egg-ts-helper
[download-image]: https://img.shields.io/npm/dm/egg-ts-helper.svg?style=flat-square
[download-url]: https://npmjs.org/package/egg-ts-helper

A simple tool for creating `d.ts` in [egg](https://eggjs.org) application. Injecting `controller, proxy, service, etc.` to definition type of egg ( such as `Context` `Application` etc. ) by [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html), and making IntelliSense works in both egg-js and egg-ts.

## Install

open your application and install.

```bash
npm i egg-ts-helper --save-dev
```

## QuickStart

Open your egg application, executing ets by [npx](https://github.com/zkat/npx)

```bash
npx ets
```

Watching files by `-w` flag.

```bash
npx ets -w
```

`egg-ts-helper` has build-in in `egg-bin`, You can easily to use it by

```bash
egg-bin dev --dts
```

or add configuration `egg.declarations` in `package.json`

## CLI

```
$ ets -h

  Usage: bin [commands] [options]

  Options:
    -v, --version           output the version number
    -w, --watch             Watching files, d.ts would recreated while file changed
    -c, --cwd [path]        Egg application base dir (default: process.cwd)
    -C, --config [path]     Configuration file, The argument can be a file path to a valid JSON/JS configuration file.（default: {cwd}/tshelper
    -o, --oneForAll [path]  Create a d.ts import all types (default: typings/ets.d.ts)
    -s, --silent            Running without output
    -i, --ignore [dirs]     Ignore generator, your can ignore multiple dirs with comma like: -i controller,service
    -e, --enabled [dirs]    Enable generator, your can enable multiple dirs with comma like: -e proxy,other
    -E, --extra [json]      Extra config, the value should be json string
    -h, --help              output usage information

  Commands:
    clean                   Clean js file while it has the same name ts/tsx file
    init <type>             Init egg-ts-helper in your existing project
```

## Configuration

| name | type | default | description |
| --- | --- | --- | --- |
| cwd | `string` | process.cwd | egg application base dir |
| typings | `string` | {cwd}/typings | typings dir |
| caseStyle | `string` `Function` | lower | egg case style(lower,upper,camel) or `(filename) => {return 'YOUR_CASE'}`|
| silent | `boolean` | false | ignore logging |
| watch | `boolean` | false | watch file change or not, default to `true` in `register`  |
| watchOptions | `object` | undefined | chokidar [options](https://github.com/paulmillr/chokidar#api) |
| autoRemoveJs | `boolean` | true | auto remove same name js on startup |
| configFile | `string` | {cwd}/tshelper.(js|json) | configure file path |
| generatorConfig | `object` | | generator configuration( watchDirs has been deprecated ) |

You can configure the options above in `./tshelper.js` `./tshelper.json` or `package.json`.

In `tshelper.js`

```js
// {cwd}/tshelper.js

module.exports = {
  generatorConfig: {
    model: {
      enabled: true,
      generator: "function",
      interfaceHandle: "InstanceType<{{ 0 }}>"
    },
  }
}
```

In `tshelper.json`

```json
// {cwd}/tshelper.json

{
  "generatorConfig": {
    "model": {
      "enabled": true,
      "generator": "function",
      "interfaceHandle": "InstanceType<{{ 0 }}>"
    },
  }
}
```

In `package.json`

```json
// {cwd}/package.json

{
  "egg": {
    "framework": "egg",
    "tsHelper": {
      "generatorConfig": {
        "model": {
          "enabled": true,
          "generator": "function",
          "interfaceHandle": "InstanceType<{{ 0 }}>"
        }
      }
    }
  }
}
```

or use `dot-prop`

```json
// {cwd}/package.json

{
  "egg": {
    "framework": "egg",
    "tsHelper": {
      "generatorConfig.model": {
        "enabled": true,
        "generator": "function",
        "interfaceHandle": "InstanceType<{{ 0 }}>"
      }
    }
  }
}
```

Also you can pass options by env ( support since 1.22.0 )

- `ETS_CWD`: cwd
- `ETS_FRAMEWORK`: framework
- `ETS_TYPINGS`: typings
- `ETS_CASE_STYLE`: caseStyle
- `ETS_AUTO_REMOVE_JS`: autoRemoveJs
- `ETS_THROTTLE`: throttle
- `ETS_WATCH`: watch
- `ETS_SILENT`: silent
- `ETS_CONFIG_FILE`: configFile

## Custom Loader

> Support since 1.24.0

`egg-ts-helper` support customLoader configuration of egg. see <https://github.com/eggjs/egg/issues/3480>

Configure in `config.default.ts`

```typescript
'use strict';

import { EggAppConfig, PowerPartial } from 'egg';

export default function(appInfo: EggAppConfig) {
  const config = {} as PowerPartial<EggAppConfig>;

  config.keys = appInfo.name + '123123';

  config.customLoader = {
    model: {
      directory: 'app/model',
      inject: 'app',
      caseStyle: 'upper',
    },
  };

  return {
    ...config as {},
    ...bizConfig,
  };
}
```

`egg-ts-helper` will auto create the d.ts for files under `app/model`

```typescript
// This file is created by egg-ts-helper@1.24.1
// Do not modify this file!!!!!!!!!

import 'egg';
type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;
import ExportCastle from '../../../app/model/Castle';
import ExportUser from '../../../app/model/User';

declare module 'egg' {
  interface Application {
    model: T_custom_model;
  }

  interface T_custom_model {
    Castle: AutoInstanceType<typeof ExportCastle>;
    User: AutoInstanceType<typeof ExportUser>;
  }
}
```

And you can easily to use it in your code.

![image](https://user-images.githubusercontent.com/5856440/54109111-b4848b80-4418-11e9-9da5-77b342f7f814.png)

## Generator

If you are using `loader.loadToApp` or `loader.loadToContext` to load the instance, you should use generator config.

### Example

Creating `d.ts` for files under `app/model`. You should add config `generatorConfig.model` in your config file.

```typescript
// ./tshelper.js

module.exports = {
  generatorConfig: {
    model: {
      directory: 'app/model', // files directory.
      // pattern: '**/*.(ts|js)', // glob pattern, default is **/*.(ts|js). it doesn't need to configure normally.
      // ignore: '', // ignore glob pattern, default to empty.
      generator: 'class', // generator name, eg: class、auto、function、object
      interface: 'IModel',  // interface name
      declareTo: 'Context.model', // declare to this interface
      // watch: true, // whether need to watch files
      // caseStyle: 'upper', // caseStyle for loader
      // interfaceHandle: val => `ReturnType<typeof ${val}>`, // interfaceHandle
      // trigger: ['add', 'unlink'], // recreate d.ts when receive these events, all events: ['add', 'unlink', 'change']
    }
  }
}
```

The configuration can create d.ts as below.

> Attention, The type will merge into egg without any pre handling if the generator field is `class`, If you dont know how it works, just using `generator: 'auto'` instead.

```typescript
import Station from '../../../app/model/station';// <-- find all files under app/model and import then.

declare module 'egg' {
  interface Context { // <-- Context is reading from `declareTo`
    model: IModel; // <-- IModel is reading from `interface`, It will create a random interface if this field is empty
  }

  interface IModel { // <-- The same as above.
    Station: Station; // <-- Merging `Station` to IModel so we can use `ctx.model.Station` in code.
  }
}
```

### Effect of different options

#### interface `string`

`interface` set to `IOther`.

```typescript
interface IOther {
  Station: Station;
}
```

It will use random interface if `interface` is not set.

```typescript
interface T100 {
  Station: Station;
}
```

Attentions: Must set `declareTo` if `interface` is not set.

#### generator `string`

The name of generator, available value is `class` `function` `object` `auto`.

**`generator: 'class'`**

the types created by `class` generator as below

```typescript
interface IModel {
  Station: Station;
}
```

It's suitable for module wrote like this

```typescript
export default class XXXController extends Controller { }
```

**`generator: 'function'`** ( Support since `1.16.0` )

the types created by `function` generator as below

```typescript
interface IModel {
  Station: ReturnType<typeof Station>; // Using ReturnType to get return type of function.
}
```

It's suitable for module like this

```typescript
export default () => {
  return {};
}
```

**`generator: 'object'`** ( Support since `1.16.0` )

the types created by `object` generator as below.

```typescript
interface IModel {
  Station: typeof Station;
}
```

It's suitable for module like this

```typescript
export default {}
```

**`generator: 'auto'`** ( Support since `1.19.0` )

the types created by `auto` generator as below. It will check types automatically.

```typescript
type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;

interface IModel {
  Station: AutoInstanceType<typeof Station>;
}
```

It's suitable for every module in above.

#### interfaceHandle `function|string`

If you cannot find suitable generator in above, you can config the type by this field.

```js
module.exports = {
  generatorConfig: {
    model: {
      ...

      interfaceHandle: val => `${val} & { [key: string]: any }`,
    }
  }
}
```

The generated typings.

```typescript
interface IModel {
  Station: Station & { [key: string]: any };
}
```

The type of `interfaceHandle` can be `string` ( Support since `1.18.0` )

```js
module.exports = {
  generatorConfig: {
    model: {
      ...

      interfaceHandle: '{{ 0 }} & { [key: string]: any }',
    }
  }
}
```

The generated typings are the same as above. `{{ 0 }}` means the first argument in function.

#### caseStyle `function|string`

`caseStyle` can set to `lower`、`upper`、`camel` or function

#### declareTo `string`

Declaring interface to definition of egg. ( Support since `1.15.0` )

`declareTo` set to `Context.model` , and you can get intellisense by `ctx.model.xxx`

```typescript
import Station from '../../../app/model/station';

declare module 'egg' {
  interface Context {
    model: IModel;
  }

  interface IModel {
    Station: Station;
  }
}
```

`declareTo` set to `Application.model.subModel`, and you can get intellisense by `app.model.subModel.xxx`

```typescript
import Station from '../../../app/model/station';

declare module 'egg' {
  interface Application {
    model: {
      subModel: IModel;
    }
  }

  interface IModel {
    Station: Station;
  }
}
```

### Defining custom generator

```javascript
// ./tshelper.js

// custom generator
function myGenerator(config, baseConfig) {
  // config.dir       dir
  // config.dtsDir    d.ts dir
  // config.file      changed file
  // config.fileList  file list
  console.info(config);
  console.info(baseConfig);

  // return type can be object or array { dist: string; content: string } | Array<{ dist: string; content: string }>
  // egg-ts-helper will remove dist file when content is undefined.
  return {
    dist: 'd.ts file url',
    content: 'd.ts content'
  }
}

module.exports = {
  generatorConfig: {
    model: {
      directory: 'app/model',
      generator: myGenerator,
      trigger: ['add', 'unlink'],
    }
  }
}
```

or define generator to other js.

```javascript
// ./my-generator.js

module.exports.defaultConfig = {
  // default watchDir config
}

// custom generator
module.exports = (config, baseConfig) => {
  // config.dir       dir
  // config.dtsDir    d.ts dir
  // config.file      changed file
  // config.fileList  file list
  console.info(config);
  console.info(baseConfig);

  // return type can be object or array { dist: string; content: string } | Array<{ dist: string; content: string }>
  // egg-ts-helper will remove dist file when content is undefined.
  return {
    dist: 'd.ts file url',
    content: 'd.ts content'
  }
}
```

configure in `tshelper.js` or `package.json`

```js
// ./tshelper.js

module.exports = {
  generatorConfig: {
    model: {
      directory: 'app/model',
      generator: './my-generator',
      trigger: ['add', 'unlink'],
    }
  }
}
```

## Demo

`egg-ts-helper` can works in both `ts` and `js` egg project.

TS demo: <https://github.com/whxaxes/egg-boilerplate-d-ts>

JS demo: <https://github.com/whxaxes/egg-boilerplate-d-js>

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/tracer)](https://github.com/eggjs/tracer/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
