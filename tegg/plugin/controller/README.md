# @eggjs/tegg-controller-plugin

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/tegg-controller-plugin.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/tegg-controller-plugin.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/tegg-controller-plugin
[snyk-image]: https://snyk.io/test/npm/@eggjs/tegg-controller-plugin/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/tegg-controller-plugin
[download-image]: https://img.shields.io/npm/dm/@eggjs/tegg-controller-plugin.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/tegg-controller-plugin

使用注解的方式来开发 egg 中的 Controller

## Install

```shell
# tegg 注解
npm i --save @eggjs/tegg@beta
# tegg 插件
npm i --save @eggjs/tegg-plugin@beta
# tegg controller 插件
npm i --save @eggjs/tegg-controller-plugin@beta
```

## Prepare

```json
// tsconfig.json
{
  "extends": "@eggjs/tsconfig"
}
```

## Config

```js
// config/plugin.js
exports.tegg = {
  package: '@eggjs/tegg-plugin',
  enable: true,
};

exports.teggController = {
  package: '@eggjs/tegg-controller-plugin',
  enable: true,
};
```

## Usage

### Middleware

Middleware 支持多个入参，依次传入要生效的中间件
中间件注解，可以添加在类/方法上。添加在类上时，对类上所有方法生效，添加在方法上时，只对当前方法生效。

```ts
// app/middleware/global_log.ts
import { Context } from 'egg';
import type { Next } from '@eggjs/controller-decorator';

export default async function globalLog(ctx: Context, next: Next) {
  ctx.logger.info('have a request');
  return next();
}

export default async function globalLog2(ctx: Context, next: Next) {
  ctx.logger.info('have a request2');
  return next();
}

// app/controller/FooController.ts
import { Middleware } from '@eggjs/tegg';
@Middleware(globalLog, globalLog2)
export class FooController {
  @Middleware(methodCount)
  async hello() {}
}
```

### Context

当需要 egg context 时，可以使用 `@Context` 注解来声明。

```ts
// app/controller/FooController.ts
import { Context, EggContext } from '@eggjs/tegg';

export class FooController {
  @Middleware(methodCount)
  async hello(@Context() ctx: EggContext) {}
}
```

### HTTP 注解

#### HTTPController/HTTPMethod

`@HTTPController` 注解用来声明当前类是一个 HTTP controller，可以配置路径前缀。
`@HTTPMethod` 注解用来声明当前方法是一个 HTTP method，只有带了这个注解，HTTP 方法才会被暴露出去，可以配置方法路径，

```ts
// app/controller/FooController.ts
import { Context, EggContext, HTTPController, HTTPMethod, HTTPMethodEnum } from '@eggjs/tegg';

@HTTPController({
  path: '/foo',
})
export class FooController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello() {}
}
```

#### Param

HTTP 协议中有各种各样的传参方式，比如 query,path,body 等等。

##### HTTPBody

接收 body 参数

```ts
// app/controller/FooController.ts
import { Context, EggContext, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPBody } from '@eggjs/tegg';

@HTTPController({
  path: '/foo',
})
export class FooController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello(@HTTPBody() name: string) {
    return `hello, ${name}`;
  }
}
```

##### HTTPQuery/HTTPQueries

两者的区别在于参数是否为数组， HTTPQuery 只会取第一个参数，HTTPQueries 只提供数组形式。
HTTPQuery 的参数类型只能是 string, HTTPQueries 的参数类型只能是 string[]。

```ts
// app/controller/FooController.ts
import { Context, EggContext, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPQuery, HTTPQueries } from '@eggjs/tegg';

@HTTPController({
  path: '/foo',
})
export class FooController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello',
  })
  async hello(
    // /foo/hello?name=bar
    // HTTPQuery: name=bar
    // HTTPQueries: name=[bar]
    @HTTPQuery() name: string,
    @HTTPQueries() names: string[]
  ) {
    return `hello, ${name}`;
  }
}
```

如果需要使用别名，比如说 query 中的 name 不能在 js 中声明时，如 foo[bar] 这类的。可以通过以下形式

```ts
@HTTPQuery({ name: 'foo[bar]' }) fooBar: string,
```

##### HTTPParam

接收 path 中的参数，类型只能为 string

```ts
// app/controller/FooController.ts
import { Context, EggContext, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPBody } from '@eggjs/tegg';

@HTTPController({
  path: '/foo',
})
export class FooController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/:id',
  })
  async hello(@HTTPParam() id: string) {
    return `hello, ${name}`;
  }
}
```

如果需要使用别名，比如说 path 中使用正则声明 `/foo/(.*)`, 可以通过以下形式

```ts
// 具体 name 值可以查看 path-to-regexp
@HTTPParam({ name: '0' }) id: string
```

### Host

Host 注解，用于指定 HTTP 方法仅在 host 匹配时执行。
可以添加在类/方法上。添加在类上时，对类上所有方法生效，添加在方法上时，只对当前方法生效。方法上的注解可以覆盖类上的注解

```ts
// app/controller/FooController.ts
import { Host } from '@eggjs/tegg';
@Host('foo.eggjs.com')
export class FooController {
  // 仅能通过 foo.eggjs.com 访问
  async hello() {}

  // 仅能通过 bar.eggjs.com 访问
  @Host('bar.eggjs.com')
  async bar() {}
}
```
