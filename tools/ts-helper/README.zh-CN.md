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

一个帮助 `egg` 生成 `d.ts` 的工具，通过 ts 提供的 [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) 能力来将 `controller, proxy, service 等等` 这些 egg 中动态加载的模块注入到 egg 的声明中。从而获得类型校验以及代码提示。

## 安装

打开应用目录并且安装

```bash
npm i egg-ts-helper --save-dev
```

## 快速开始

打开你的 egg 应用，通过 [npx](https://github.com/zkat/npx) 来执行 ets 指令

```bash
npx ets
```

可以通过 `-w` 来监听文件改动并且重新生成 `d.ts`

```bash
npx ets -w
```

`egg-ts-helper` 已经内置在 `egg-bin` 中，可以通过以下命令方便使用

```bash
egg-bin dev --dts
```

再或者在 `package.json` 中配置 `egg.declarations` 为 true 即可。

## 命令行

```bash
$ ets -h

  Usage: ets [commands] [options]

  Options:

    -v, --version           版本号
    -w, --watch             是否监听文件改动
    -c, --cwd [path]        Egg 的项目目录，(默认值: process.cwd)
    -C, --config [path]     配置文件，入参应该是合法的 JSON/JS 文件 (默认值: {cwd}/tshelper)
    -o, --oneForAll [path]  创建一个 import 了所有生成的 d.ts 的声明 (默认值: typings/ets.d.ts)
    -s, --silent            静默执行，不输出日志
    -i, --ignore [dirs]     忽略 generator 中的相关配置，可以通过逗号配置忽略多个，比如: -i controller,service
    -e, --enabled [dirs]    开启 generator 中的相关配置， 可以通过逗号配置忽略多个，比如: -e proxy,other
    -E, --extra [json]      额外配置，可以是 json 字符串
    -h, --help              帮助

  Commands:

    clean                   清除所有包含同名 ts/tsx 文件的 js 文件
    init <type>             在你的项目中初始化 egg-ts-helper
```

## 配置

| name | type | default | description |
| --- | --- | --- | --- |
| cwd | `string` | process.cwd | Egg 的项目目录 |
| typings | `string` | {cwd}/typings | 生成的声明放置目录 |
| caseStyle | `string` `Function` | lower | egg 的模块命名方式 (lower (首字母小写), upper (首字母大写), camel (驼峰) ) ，也可以传方法 `(filename) => {return 'YOUR_CASE'}`|
| silent | `boolean` | false | 静默执行，不输出日志 |
| watch | `boolean` | false | 是否监听文件改动，使用 `register` 的话该值默认为 true |
| watchOptions | `object` | undefined | chokidar 的[配置](https://github.com/paulmillr/chokidar#api) |
| configFile | `string` | {cwd}/tshelper.(js|json) | 配置文件路径 |
| generatorConfig | `object` | | 生成器配置 |

可以在  `./tshelper.js`  `./tshelper.json` 或者 `package.json` 中配置上面的配置

在 `tshelper.js`

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

在 `tshelper.json`

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

在 `package.json`

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
        },
      }
    }
  }
}
```

同时也可以通过环境变量来传入配置 ( 1.22.0 版本后开始支持 )

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

> 在 1.24.0 之后版本支持

`egg-ts-helper` 支持 egg 的 customLoader 配置，会自动去读取应用/插件/框架中的 customLoader 配置. 详情请看 <https://github.com/eggjs/egg/issues/3480>

在 `config.default.ts` 中配置 customLoader

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

`egg-ts-helper` 将会根据 `app/model` 目录下的文件，自动生成声明 （ 参考 <https://github.com/whxaxes/egg-boilerplate-d-ts> 这个项目 ）

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

然后你就可以愉快的在代码中使用了。

![image](https://user-images.githubusercontent.com/5856440/54109111-b4848b80-4418-11e9-9da5-77b342f7f814.png)

## Generator

如果需要支持老的 customLoader 方式（ 即指在 app.ts 等中调用 `loader.loadToApp` 或者 `loader.loadToContext` 的方式实现的 customLoader ），则需要使用 `egg-ts-helper` 生成器配置。

### 示例

比如需要给 `app/model` 下的文件创建 `d.ts`，则需要在你的配置文件中配置一下 `generatorConfig.model`。

```typescript
// ./tshelper.js

module.exports = {
  generatorConfig: {
    model: {
      directory: 'app/model', // 监听目录
      // pattern: '**/*.(ts|js)', // 遍历的文件表达式，一般都不需要改这个
      // ignore: '', // 指定忽略某些文件的表达式，默认为空
      generator: 'class', // 生成器名称，取值为 class、auto、function、object
      interface: 'IModel',  // interface 名称，如果不填的话，将会随机生成个 interface
      declareTo: 'Context.model', // 指定定义到 egg 的某个类型下
      // watch: true, // 是否需要监听文件改动
      // caseStyle: 'upper', // 模块命名格式
      // interfaceHandle: val => `ReturnType<typeof ${val}>`, // interface 预处理方法
      // trigger: ['add', 'unlink'], // 当接收到这些文件更改事件的时候，会触发 d.ts 的重新生成, 所有事件: ['add', 'unlink', 'change']
    }
  }
}
```

使用上面的配置，会生成下面这个 `d.ts`

> 注意，上面的 generator 是 class ，生成的声明即会对 import 进来的类型直接挂载，不会做任何处理，如果不了解这个，请配置 `auto` 类型。

```typescript
import Station from '../../../app/model/station'; // <-- 遍历 app/model 目录并且 import

declare module 'egg' {
  interface Context { // <-- 这个 Context 是读配置中的 declareTo
    model: IModel; // <-- 这个 IModel 是读配置中的 interface ，如果不传，会随机生成个 interface
  }

  interface IModel { // <-- 这个 IModel 同上
    Station: Station; // <-- 将 app/model 中的文件 import 挂载到 IModel 上，从而将类型合并到 ctx.model 中
  }
}
```

### 不同配置的效果

#### interface `string`

`interface` 设置为 `IOther`.

```typescript
interface IOther {
  Station: Station;
}
```

如果不设置 `interface` 将会使用随机的名称

```typescript
interface T100 {
  Station: Station;
}
```

这种情况下请一定要配置 `declareTo`，不然就没意义了。

#### generator `string`

生成器名称，watcher 监听到文件改动的时候会执行该生成器用来重新生成 d.ts，可以使用的生成器名称为 `class` `function` `object` `auto` 。下面列举一下不同生成器生成的声明有什么不同。

**`generator: 'class'`**

生成的声明如下

```typescript
interface IModel {
  Station: Station; // 不做任何处理，直接挂载
}
```

适合这样写的模块

```typescript
export default class XXXController extends Controller { }
```

**`generator: 'function'`** ( `1.16.0` 开始支持 )

生成的声明如下

```typescript
interface IModel {
  Station: ReturnType<typeof Station>; // 使用 ReturnType 获得方法的返回类型
}
```

适合这样写的模块

```typescript
export default () => {
  return {};
}
```

**`generator: 'object'`** ( `1.16.0` 开始支持 )

生成的声明如下

```typescript
interface IModel {
  Station: typeof Station; // 使用 typeof 获得对象的原始类型。
}
```

适合这样写的模块

```typescript
export default {}
```

**`generator: 'auto'`** ( `1.19.0` 开始支持 )

生成的声明如下，自动判断 import 的类型是方法还是对象还是类，即用了这个，你就不用管 export 的是方法还是对象还是类了，对类型了解不清楚的可以直接用这个。

```typescript
type AutoInstanceType<T, U = T extends (...args: any[]) => any ? ReturnType<T> : T> = U extends { new (...args: any[]): any } ? InstanceType<U> : U;

interface IModel {
  Station: AutoInstanceType<typeof Station>;
}
```

适合上面描述的所有模块。

#### interfaceHandle `function|string`

如果在 generator 中找不到合适的生成器类型，可以通过该配置对类型进行预处理。

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

生成的声明如下

```typescript
interface IModel {
  Station: Station & { [key: string]: any };
}
```

这个配置也可以是字符串 ( `1.18.0` 开始支持 )

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

生成的声明跟前面方法那个一样，`{{ 0 }}` 代表方法的第一个入参。

#### caseStyle `function|string`

`caseStyle` 可以设置为 `lower`、`upper`、`camel` 或者是方法。

#### declareTo `string`

可以将生成的声明定义到 egg 的类型中，比如 egg 的 ctx 的类型是 `Context` ，就可以配置到 `Context` 下，然后通过 ctx.xxx 就可以拿到提示了。 ( `1.15.0` 开始支持 )

`declareTo` 设置为 `Context.model`，然后就可以通过 `ctx.model.xxx` 拿到代码提示了

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

`declareTo` 设置为 `Application.model.subModel`，然后就可以通过 `app.model.subModel.xxx` 拿到代码提示了

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

### 自定义生成器

```javascript
// ./tshelper.js

// 自定义 generator
function myGenerator(config, baseConfig) {
  // config.dir       dir
  // config.dtsDir    d.ts 目录
  // config.file      发生更改的文件 file
  // config.fileList  path 下的文件列表
  console.info(config);
  console.info(baseConfig);

  // 返回值可以是对象或者数组 { dist: string; content: string } | Array<{ dist: string; content: string }>
  // 如果返回的 content 是 undefined，egg-ts-helper 会删除 dist 指向的文件
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

或者将自定义生成器定义到其他 js 中

```javascript
// ./my-generator.js

module.exports.defaultConfig = {
  // 默认的 watchDir config
}

// 自定义 generator
module.exports = (config, baseConfig) => {
  // config.dir       dir
  // config.dtsDir    d.ts 目录
  // config.file      发生更改的文件 file
  // config.fileList  path 下的文件列表
  console.info(config);
  console.info(baseConfig);

  // 返回值可以是对象或者数组 { dist: string; content: string } | Array<{ dist: string; content: string }>
  // 如果返回的 content 是 undefined，egg-ts-helper 会删除 dist 指向的文件
  return {
    dist: 'd.ts file url',
    content: 'd.ts content'
  }
}
```

配置一下

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

## 示例项目

`egg-ts-helper` 可用于 egg 的 `ts` 和 `js` 项目.

TS 项目: <https://github.com/whxaxes/egg-boilerplate-d-ts>

JS 项目: <https://github.com/whxaxes/egg-boilerplate-d-js>

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/tracer)](https://github.com/eggjs/tracer/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
