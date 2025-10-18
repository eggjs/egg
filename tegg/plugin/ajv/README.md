# @eggjs/tegg-ajv-plugin

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/tegg-ajv-plugin.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/tegg-ajv-plugin.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/tegg-ajv-plugin
[snyk-image]: https://snyk.io/test/npm/@eggjs/tegg-ajv-plugin/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/tegg-ajv-plugin
[download-image]: https://img.shields.io/npm/dm/@eggjs/tegg-ajv-plugin.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/tegg-ajv-plugin

参考 [egg-typebox-validate](https://github.com/xiekw2010/egg-typebox-validate) 的最佳实践，结合 ajv + typebox，只需要定义一次参数类型和规则，就能同时拥有参数校验和类型定义（完整的 ts 类型提示）。

## egg 模式

### Install

```shell
# tegg 注解
npm i --save @eggjs/tegg
# tegg 插件
npm i --save @eggjs/tegg-plugin
# tegg ajv 插件
npm i --save @eggjs/tegg-ajv-plugin
```

### Prepare

```json
// tsconfig.json
{
  "extends": "@eggjs/tsconfig"
}
```

### Config

```js
// config/plugin.js
exports.tegg = {
  package: '@eggjs/tegg-plugin',
  enable: true,
};

exports.teggAjv = {
  package: '@eggjs/tegg-ajv-plugin',
  enable: true,
};
```

## standalone 模式

### Install

```shell
# tegg 注解
npm i --save @eggjs/tegg
# tegg ajv 插件
npm i --save @eggjs/tegg-ajv-plugin
```

### Prepare

```json
// tsconfig.json
{
  "extends": "@eggjs/tsconfig"
}
```

## Usage

1、定义入参校验 Schema

使用 typebox 定义，会内置到 tegg 导出

```ts
import { Type, TransformEnum } from '@eggjs/tegg/ajv';

const SyncPackageTaskSchema = Type.Object({
  fullname: Type.String({
    transform: [TransformEnum.trim],
    maxLength: 100,
  }),
  tips: Type.String({
    transform: [TransformEnum.trim],
    maxLength: 1024,
  }),
  skipDependencies: Type.Boolean(),
  syncDownloadData: Type.Boolean(),
  // force sync immediately, only allow by admin
  force: Type.Boolean(),
  // sync history version
  forceSyncHistory: Type.Boolean(),
  // source registry
  registryName: Type.Optional(Type.String()),
});
```

2、从校验 Schema 生成静态的入参类型

```ts
import { Static } from '@eggjs/tegg/ajv';

type SyncPackageTaskType = Static<typeof SyncPackageTaskSchema>;
```

3、在 Controller 中使用入参类型和校验 Schema

注入全局单例 ajv，调用 `ajv.validate(XxxSchema, params)` 进行参数校验，参数校验失败会直接抛出 `AjvInvalidParamError` 异常，
tegg 会自动返回相应的错误响应给客户端。

```ts
import { Inject, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPBody } from '@eggjs/tegg';
import { Ajv, Type, Static, TransformEnum } from '@eggjs/tegg/ajv';

const SyncPackageTaskSchema = Type.Object({
  fullname: Type.String({
    transform: [TransformEnum.trim],
    maxLength: 100,
  }),
  tips: Type.String({
    transform: [TransformEnum.trim],
    maxLength: 1024,
  }),
  skipDependencies: Type.Boolean(),
  syncDownloadData: Type.Boolean(),
  // force sync immediately, only allow by admin
  force: Type.Boolean(),
  // sync history version
  forceSyncHistory: Type.Boolean(),
  // source registry
  registryName: Type.Optional(Type.String()),
});

type SyncPackageTaskType = Static<typeof SyncPackageTaskSchema>;

@HTTPController()
export class HelloController {
  private readonly ajv: Ajv;

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/sync',
  })
  async sync(@HTTPBody() task: SyncPackageTaskType) {
    this.ajv.validate(SyncPackageTaskSchema, task);
    return {
      task,
    };
  }
}
```
