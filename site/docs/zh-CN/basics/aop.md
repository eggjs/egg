# AOP 切面编程

## 背景

在业务开发中，常常会有日志记录、安全校验等逻辑。这些逻辑通常与具体业务无关，属于横向应用于多个模块间的通用逻辑。在面向切面编程（Aspect-Oriented Programming, AOP）中，将这些逻辑定义为切面。

> 更多关于 AOP 的知识，可以查看 [Aspect-oriented programming](https://en.wikipedia.org/wiki/Aspect-oriented_programming)。

## 使用

### Advice

使用 `@Advice` 注解来申明一个实现，可以用来监听、拦截方法执行。

:::warning
<strong>注意：Advice 也是一种 Prototype, 默认的 initType 为 Context ，可以通过 initType 来指定其他的生命周期。</strong>
:::

```ts
import { Advice, IAdvice, AdviceContext } from 'egg/aop';
import { Inject } from 'egg';

@Advice()
export class AdviceExample implements IAdvice {
  // Advice 中可以正常的注入其他的对象
  @Inject()
  private readonly callTrace: CallTrace;

  // 在函数执行前执行
  async beforeCall(ctx: AdviceContext): Promise<void> {
    // ...
  }

  // 在函数成功后执行
  async afterReturn(ctx: AdviceContext, result: any): Promise<void> {
    // ...
  }

  // 在函数失败后执行
  async afterThrow(ctx: AdviceContext, error: Error): Promise<void> {
    // ...
  }

  // 在函数退出时执行
  async afterFinally(ctx: AdviceContext): Promise<void> {
    // ...
  }

  // 类似 koa 中间件的模式
  // block = next
  async around(ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    // ...
  }
}
```

### Pointcut

使用 `@Pointcut` 在某个类特定的方法上申明一个 `Advice`

```ts
import { SingletonProto } from 'egg';
import { Pointcut } from 'egg/aop';
import { AdviceExample } from './AdviceExample';

@SingletonProto()
export class Hello {
  @Pointcut(AdviceExample)
  async hello(name: string) {
    return `hello ${name}`;
  }
}
```

### Crosscut

使用 `@Crosscut` 来声明一个通用的 `Advice`，有三种模式

- 指定类和方法
- 通过正则指定类和方法
- 通过回调来指定类和方法

:::warning
<strong>注意：Egg 中的对象无法被 Crosscut 指定</strong>
:::

```ts
import { Crosscut, Advice, IAdvice } from 'egg/aop';

// 通过类型来指定
@Crosscut({
  type: PointcutType.CLASS,
  clazz: CrosscutExample,
  methodName: 'hello',
})
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

// 目标对象
@ContextProto()
export class CrosscutExample {
  hello() {
    console.log('hello');
  }
}
```

### AdviceContext

所有切面函数的第一个入参都是一个 `AdviceContext` 变量，这个变量的数据结构如下：

```typescript
interface AdviceContext<T = object, K = any> {
  that: T; //
  method: PropertyKey;
  args: any[];
  adviceParams?: K;
}
```

- that，被切的对象，`Pointcut`中代表被切函数所在类的实例，`Crosscut`中代表被切类的实例
- method，被切的函数
- args，被切函数的入参
- adviceParams，切面注解透传的参数

被切函数执行过程的伪代码如下：

```typescript
await beforeCall(ctx);
try {
  const result = await around(ctx, next);
  await afterReturn(ctx, result);
  return result;
} catch (e) {
  await afterThrow(ctx, e);
  throw e;
} finally {
  await afterFinally(ctx);
}
```

根据上面的实现过程切面函数可以通过`AdviceContext`来影响被切函数的执行：

```typescript
@Advice()
class PointcutAdvice implements IAdvice<Hello> {
  @Inject()
  logger: EggLogger;

  // 修改被切函数的入参
  async beforeCall(ctx: AdviceContext<Hello>): Promise<void> {
    ctx.args = ['for', 'bar'];
  }

  // 修改被切函数的返回值
  async afterReturn(ctx: AdviceContext<Hello>, result: any): Promise<void> {
    result.foo = 'bar';
  }

  // 记录调用异常
  async afterThrow(
    ctx: AdviceContext<Hello, any>,
    error: Error,
  ): Promise<void> {
    this.logger.info(
      `${ctx.that.constructor.name}.${ctx.method.name} throw an error: %j`,
      error,
    );
  }

  // 打个调用结束的日志
  async afterFinally(ctx: AdviceContext<Hello>): Promise<void> {
    this.logger.info(
      `called ${ctx.that.constructor.name}.${ctx.method.name}, params: %j`,
      args,
    );
  }

  // 修改被切函数的调用过程，比如将被切函数放到事务中执行
  async around(
    ctx: AdviceContext<Hello>,
    next: () => Promise<any>,
  ): Promise<any> {
    await this.runInTransaction(next);
  }
}
```

### 参数透传

同一个切面在不同的函数上可能会有不同的处理流程，比如事务存在不同的传播机制，如果期望用同一个事务注解来支持不同的传播机制，则需要在注解中传入参数。因此在 AOP 中增加了参数透传，切面函数执行时可以通过 `ctx.adviceParams`获取切面注解中传入的 `options.adviceParams`

```typescript
const pointcutParams = { foo: 'bar' };
const crosscutParams = { bar: 'foo' };

@Advice()
export class AdviceExample implements IAdvice {
  async around(ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    assert.strictEqual(ctx.adviceParams, pointcutParams);
  }
}

@Crosscut(
  {
    type: PointcutType.NAME,
    className: /crosscut.*/i,
    methodName: /hello/,
  },
  { adviceParams: crosscutParams },
)
@Advice()
export class CrosscutNameAdviceExample implements IAdvice {
  async around(ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    assert.strictEqual(ctx.adviceParams, crosscutParams);
  }
}

@ContextProto()
export class Hello {
  @Pointcut(AdviceExample, { adviceParams: pointcutParams })
  async hello(name: string) {
    return `hello ${name}`;
  }
}
```

## 🌰 例子

### 打印接口结果及耗时日志

#### 实现日志打印 Advice

```typescript
import { SingletonProto, Inject, Logger, Tracer } from 'egg';
import { Advice, IAdvice, AdviceContext } from 'egg/aop';

@Advice()
class MethodLogAdvice implements IAdvice {
  private start: number;
  private succeed = true;

  @Inject()
  readonly tracer: Tracer;

  @Inject()
  private readonly logger: Logger;

  // 方法调用前，记录开始执行时间
  async beforeCall() {
    this.start = Date.now();
  }

  // 若方法抛出异常，则标记 succeed 为 false
  async afterThrow() {
    this.succeed = false;
  }

  // 方法调用结束后，打印日志
  async afterFinally(ctx: AdviceContext) {
    this.logger.info(
      ctx.method +
        ',' +
        (this.succeed ? 'Y' : 'N') +
        ',' +
        (Date.now() - this.start) +
        'ms,' +
        this.tracer.traceId +
        ',' +
        this.tracer.lastSofaRpcId +
        ',',
    );
  }
}
```

#### 使用 Advice

```typescript
import { Pointcut, SingletonProto, Inject } from 'egg';
import { MethodLogAdvice } from './MethodLogAdvice';

@SingletonProto()
class FooService {
  @Pointcut(MethodLogAdvice)
  async foo() {
    // ...
  }
}
```

### 打印 oneapi 调用参数及耗时

在函数应用中，或者使用 layotto 链路进行 oneapi 调用的标准应用（oneapi 配置了 lang: node）中，若想要打印 oneapi 调用的参数及耗时，可以通过 AOP 来实现。使用 CUSTOM 类型 crosscut 实现，框架启动时，会对所有的 oneapi facade 类进行切面织入。

```typescript
import {
  Advice,
  AdviceContext,
  Crosscut,
  EggProtoImplClass,
  IAdvice,
  Inject,
  LayottoFacade,
  Logger,
  PointcutType,
} from 'egg';

@Crosscut({
  type: PointcutType.CUSTOM,
  callback: (clazz: EggProtoImplClass, method: PropertyKey) => {
    return (
      clazz.prototype instanceof LayottoFacade && // 是否为 oneapi 生成的 facade 类
      method !== 'constructor' &&
      clazz.prototype.hasOwnProperty(method)
    ); // 排除 constructor 和父类方法
  },
})
@Advice()
export class OneapiCallAdvice implements IAdvice<LayottoFacade> {
  @Inject()
  logger: Logger; // 可以修改为注入自定义实现的 logger

  async around(
    ctx: AdviceContext<LayottoFacade>,
    next: () => Promise<any>,
  ): Promise<any> {
    const facadeName = ctx.that.constructor.name;
    const methodName = ctx.method;
    const start = Date.now();
    const res = await next();
    const cost = Date.now() - start;
    this.logger.info(
      '%s.%s called, cost: %d, params: %j, result: %j',
      facadeName,
      methodName,
      cost,
      ctx.args,
      res,
    );
    return res;
  }
}
```
