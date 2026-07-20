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

`@eggjs/standalone` 用于在没有 Egg Application 的环境中加载并运行 tegg
module。

## 安装

```bash
npm install @eggjs/standalone
```

## 使用

使用 `@Runner()` 标记入口类。入口类仍需声明为 tegg proto，例如
`@SingletonProto()`。

```ts
import { main } from '@eggjs/standalone';
import { Inject, SingletonProto } from '@eggjs/tegg';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<string> {
  @Inject()
  hello: { hello(): string };

  async main(): Promise<string> {
    return this.hello.hello();
  }
}

await main('/path/to/module', {
  innerObjectHandlers: {
    hello: [{ obj: { hello: () => 'hello, standalone' } }],
  },
});
```

第一个参数是入口 module 目录。常用选项包括：

- `name`、`env`：运行时名称和环境；
- `dependencies`：需要一同扫描的业务 module；
- `frameworkDeps`：在业务 module 之前加载的框架 module；
- `innerObjectHandlers`：宿主提供的可注入对象；
- `logger`：框架日志和注入使用的 logger；
- `manifest`、`loaderFS`：无文件系统运行环境使用的预扫描数据。

`logger` 必须通过专用选项传入。`config`、`moduleConfigs`、
`moduleConfig` 和 `runtimeConfig` 由 standalone 维护，不能通过
`innerObjectHandlers` 覆盖。

## 配置

每个 module 可以使用 `module.yml` 定义配置，并通过以下对象读取：

- `moduleConfigs`：所有 module 的配置集合；
- `moduleConfig`：当前 module 的配置；
- 带 `@ConfigSourceQualifier('<name>')` 的 `moduleConfig`：指定 module
  的配置；
- `config`：入口 module 的应用级配置。

当指定 `env` 时，`module.default.yml` 和 `module.<env>.yml` 会参与配置合并。

```yaml
# module.yml
features:
  dynamic:
    foo: bar
```

```ts
@ContextProto()
export class Foo {
  @Inject()
  moduleConfigs: ModuleConfigs;

  @Inject()
  moduleConfig: ModuleConfig;

  @Inject()
  @ConfigSourceQualifier('bar')
  barModuleConfig: ModuleConfig;

  @Inject()
  config: Record<string, unknown>;
}
```
