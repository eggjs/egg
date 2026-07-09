# `@eggjs/standalone`

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/standalone.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/standalone.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/standalone
[snyk-image]: https://snyk.io/test/npm/@eggjs/standalone/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/standalone
[download-image]: https://img.shields.io/npm/dm/@eggjs/standalone.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/standalone

通过 `@eggjs/standalone` 在一个独立环境去中运行 tegg 应用。

## install

```sh
npm i --save @eggjs/standalone
```

## Usage

当一个类上有 Runner 注解时，会自动运行其 main 函数。注无需再使用 `ContextProto` 注解，因为独立运行跑完即销毁，不用再区分独立上下文。

```ts
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<string> {
  @Inject()
  hello: Hello;

  async main(): Promise<string> {
    return this.hello.hello();
  }
}
```

运行代码

- cwd 为当前应用工作目录
- options:
  - innerObjectHandlers: 当前运行环境中内置的对象

```
await main(cwd, {
  innerObjectHandlers: {
    hello: {
      hello: () => {
        return 'hello, inner';
      },
    },
  },
});
```

### 配置

module 支持通过 module.yml 来定义配置，在代码中可以通过注入 moduleConfigs 获取全局配置，通过注入 moduleConfig 来获取单 module 的配置。

```yaml
# module.yml
# module 根目录中

features:
  dynamic:
    foo: 'bar'
```

```ts
@ContextProto()
export class Foo {
  // 获取全局配置, 通过 get 方法来获取特定 module 的配置
  @Inject()
  moduleConfigs: ModuleConfigs;

  // 注入当前 module 的配置
  @Inject()
  moduleConfig: ModuleConfig;

  // 注入 "bar" module 的配置
  @Inject({
    name: 'moduleConfig',
  })
  @ConfigSourceQualifier('bar')
  barModuleConfig: ModuleConfig;

  async main() {
    return {
      configs: this.moduleConfigs,
      foo: this.moduleConfig,
      bar: this.barModuleConfig,
    };
  }
}
```
