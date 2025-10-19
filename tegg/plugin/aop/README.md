# @eggjs/tegg-aop-plugin

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/tegg-aop-plugin.svg?style=flat)](https://nodejs.org/en/download/)

[npm-image]: https://img.shields.io/npm/v/@eggjs/tegg-aop-plugin.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/tegg-aop-plugin
[snyk-image]: https://snyk.io/test/npm/@eggjs/tegg-aop-plugin/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/tegg-aop-plugin
[download-image]: https://img.shields.io/npm/dm/@eggjs/tegg-aop-plugin.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/tegg-aop-plugin

## Usage

```js
// plugin.js
export.aopModule = {
  enable: true,
  package: '@eggjs/tegg-aop-plugin',
};
```

## Advice

使用 `@Advice` 注解来申明一个实现，可以用来监听、拦截方法执行。

**注意：Advice 也是一种 Prototype，可以通过 initType 来指定不同的生命周期，默认为 Singleton。**

如需在调用过程中保存状态，可以将状态通过 `AdviceContext` 的 get/set 来保存。

```ts
import { Advice, IAdvice } from '@eggjs/tegg/aop';

const FOO_STATE_SYMBOL = Symbol('AdviceExample#state');

@Advice()
export class AdviceExample implements IAdvice {
  // Advice 中可以正常的注入其他的对象
  @Inject()
  private readonly callTrace: CallTrace;

  // 在函数执行前执行
  async beforeCall(ctx: AdviceContext): Promise<void> {
    // ...
    ctx.set(FOO_STATE_SYMBOL, 23333);
  }

  // 在函数成功后执行
  async afterReturn(ctx: AdviceContext, result: any): Promise<void> {
    // 将会打印 23333
    console.log(ctx.get(FOO_STATE_SYMBOL));
  }

  // 在函数成功后执行
  async afterThrow(ctx: AdviceContext, error: Error): Promise<void> {
    // ...
  }

  // 在函数退出时执行
  async afterFinally(ctx: AdviceContext): Promise<void> {}

  // 类似 koa 中间件的模式
  // block = next
  async around(ctx: AdviceContext, next: () => Promise<any>): Promise<any> {}
}
```

## Pointcut

使用 `@Pointcut` 在某个类特定的方法上申明一个 `Advice`

```ts
import { Pointcut } from '@eggjs/tegg/aop';
import { ContextProto } from '@eggjs/tegg';

@ContextProto()
export class Hello {
  // 创建 Hello.hello 的切面 AdviceExample，并传递 adviceParams 给 AdviceExample
  // AdviceExample 的切面函数可以通过 ctx.adviceParams 拿到注解传入的参数
  @Pointcut(AdviceExample, { adviceParams: { foo: 'bar' } })
  async hello(name: string) {
    return `hello ${name}`;
  }
}
```

## Crosscut

使用 `@Crosscut` 来声明一个通用的 `Advice`，有三种模式

- 指定类和方法
- 通过正则指定类和方法
- 通过回调来指定类和方法

**注意：egg 中的对象无法被 Crosscut 指定到。**

```ts
import { Crosscut, Advice, IAdvice } from '@eggjs/tegg/aop';

// 通过类型来指定
// 创建 CrosscutClassAdviceExample.hello 的切面 CrosscutExample，并传递 adviceParams 给 CrosscutExample
// CrosscutExample 的切面函数可以通过 ctx.adviceParams 拿到注解传入的参数
@Crosscut(
  {
    type: PointcutType.CLASS,
    clazz: CrosscutExample,
    methodName: 'hello',
  },
  { adviceParams: { foo: 'bar' } }
)
@Advice()
export class CrosscutClassAdviceExample implements IAdvice {}

// 通过正则来指定
@Crosscut({
  type: PointcutType.NAME,
  className: /crosscut.*/i,
  methodName: /hello/,
})
@Advice()
export class CrosscutNameAdviceExample implements IAdvice {}

// 通过回调来指定
@Crosscut({
  type: PointcutType.CUSTOM,
  callback: (clazz: EggProtoImplClass, method: PropertyKey) => {
    return clazz === CrosscutExample && method === 'hello';
  },
})
@Advice()
export class CrosscutCustomAdviceExample implements IAdvice {}
```
