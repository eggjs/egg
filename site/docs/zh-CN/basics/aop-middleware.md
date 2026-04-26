# AOP 中间件

## 使用场景

一个请求进来后，会执行一系列处理，然后返回响应给用户。这个过程像一条管道，管道的每一个切面逻辑，称为 `Middleware`。这种模型也被形象地称为“洋葱模型”。

![洋葱模型](https://mdn.alipayobjects.com/huamei_1jxgeu/afts/img/cwwCRpOnomgAAAAARSAAAAgADpOHAQFr/original)

`Middleware` 非常适合用于实现如日志记录、安全校验等与具体业务无关的横切面逻辑。

### 开启插件

```typescript
// config/plugin.ts
export default {
  teggAop: true,
};
```

#### 标准 AOP 写法

标准 AOP 实现方式满足绝大部份场景，完全按照 AOP 装饰器使用方式实现即可。

```typescript
import { Inject, Logger, ObjectInitType, Tracer } from 'egg';
import { Advice, IAdvice, AdviceContext } from 'egg/aop';

@Advice({ initType: ObjectInitType.SINGLETON })
export class SimpleAopAdvice implements IAdvice {
  @Inject()
  logger: Logger;

  @Inject()
  tracer: Tracer;

  async around(ctx: AdviceContext, next: () => Promise<any>) {
    // 控制器前执行的逻辑
    const startTime = Date.now();
    this.logger.info('args: %j', ctx.args); // 调用 controller 方法，传入的参数

    // 执行下一个 middleware
    const res = await next();

    // 控制器之后执行的逻辑
    this.logger.info('%dms, traceId: %s', Date.now() - startTime, this.tracer.traceId);

    // 对结果进行处理后，再返回
    return {
      res,
      traceId: this.tracer.traceId,
    };
  }
}
```

## 使用 `Middleware`

实现好中间件逻辑后，通过 `Middleware` 装饰器，将中间件应用于具体的 controller 中，使其生效。`Middleware` 装饰器可用于 controller 类或者 controller 类中的方法。

- `Middleware` 装饰器用于类上时，表示该类的所有方法都会应用该中间件。
- `Middleware` 装饰器用于方法上时，表示只有该方法会应用该中间件。
- 若类和方法上都有 `Middleware` 装饰器，会先执行类上的中间件，再执行方法上的中间件。
- 若混用 Aop 中间件和函数式中间件，函数式中间件会先于所有 Aop 中间件执行。

```typescript
import { Middleware } from 'egg';

@Middleware(globalLog)
export class FooController {
  // 执行顺序
  // 进
  // 1. globalLog(ctx, next)
  // 2. methodCount(ctx, next)
  // 3. hello()
  // 出
  // 4. methodCount(ctx, next)
  // 5. globalLog(ctx, next)
  @Middleware(methodCount)
  async hello() {}

  // 执行顺序
  // 进
  // 1. globalLog(ctx, next)
  // 2. methodCount3(ctx, next)
  // 3. methodCount2(ctx, next)
  // 4. methodCount1(ctx, next)
  // 5. mulitple()
  // 出
  // 6. methodCount1(ctx, next)
  // 7. methodCount2(ctx, next)
  // 8. methodCount3(ctx, next)
  // 9. globalLog(ctx, next)
  @Middleware(methodCount1)
  @Middleware(methodCount2)
  @Middleware(methodCount3)
  async multiple() {}

  // 执行顺序
  // 进
  // 1. globalLog(ctx, next)
  // 2. bye()
  // 出
  // 3. globalLog(ctx, next)
  async bye() {}
}
```
