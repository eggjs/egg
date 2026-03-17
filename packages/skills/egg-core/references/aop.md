# AOP 切面编程指南

## 常见错误

| 错误写法                                   | 正确写法                              | 说明                                                                                   |
| ------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------- |
| `import { Advice } from 'egg'`             | `import { Advice } from 'egg/aop'`    | AOP 装饰器从 `egg/aop` 导入，不是 `egg`                                                |
| `import { Advice } from '@eggjs/tegg/aop'` | `import { Advice } from 'egg/aop'`    | 统一从 `egg/aop` 导入                                                                  |
| Advice 类没有加 `@Advice()` 装饰器         | 必须同时有 `@Advice()`                | `@Pointcut` 和 `@Crosscut` 都要求目标是 Advice 类                                      |
| `@Crosscut` 直接切 Egg 内置对象            | 只能切 tegg Proto 对象                | Egg 中的对象（如 app、ctx）无法被 Crosscut                                             |
| Advice 中用实例属性存状态                  | 使用 `ctx.set()`/`ctx.get()` 共享状态 | Advice 默认是 Singleton，实例属性会被并发请求共享，必须用 AdviceContext 传递调用级状态 |

---

## 核心概念

### Advice（切面逻辑）

Advice 是 AOP 的核心，定义了在目标方法执行前后要做什么。Advice 本身也是一种 Proto，默认 initType 为 Singleton（全局单例），可以使用 `@Inject` 注入依赖。如需每请求一个实例，显式指定 `@Advice({ initType: ObjectInitType.CONTEXT })`。

```typescript
import { Advice, IAdvice, AdviceContext } from 'egg/aop';
import { Inject, Logger } from 'egg';

@Advice()
export class LogAdvice implements IAdvice {
  @Inject()
  private logger: Logger;

  async beforeCall(ctx: AdviceContext): Promise<void> {
    ctx.set('startTime', Date.now());
  }

  async afterReturn(ctx: AdviceContext, result: any): Promise<void> {
    // 方法成功返回后执行
  }

  async afterThrow(ctx: AdviceContext, error: Error): Promise<void> {
    // 方法抛出异常后执行
  }

  async afterFinally(ctx: AdviceContext): Promise<void> {
    const duration = Date.now() - ctx.get('startTime');
    this.logger.info('%s cost %dms', String(ctx.method), duration);
  }

  async around(ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    // 类似 koa 中间件，可以包裹方法执行
    return await next();
  }
}
```

**执行顺序：**

```typescript
await beforeCall(ctx);
try {
  const result = await around(ctx, next);  // next 执行目标方法
  await afterReturn(ctx, result);
  return result;
} catch (e) {
  await afterThrow(ctx, e);
  throw e;
} finally {
  await afterFinally(ctx);
}
```

**关键点：**

- 所有 hook 方法都是可选的，按需实现
- 只有 `around` 可以修改返回值
- `beforeCall` 中可以通过修改 `ctx.args` 改变方法入参
- 多个 Advice 之间通过 `ctx.set(key, value)` / `ctx.get(key)` 共享状态

### AdviceContext

```typescript
interface AdviceContext<T = object, K = any> {
  that: T;              // 被切的对象实例
  method: PropertyKey;  // 被切的方法名
  args: any[];          // 方法参数（可修改）
  adviceParams?: K;     // 装饰器透传的参数
  get(key: PropertyKey): any;       // 获取共享状态
  set(key: PropertyKey, value: any): this;  // 设置共享状态
}
```

---

## Pointcut vs Crosscut

### Pointcut — 精确切入

在特定类的特定方法上声明 Advice，适合精确控制：

```typescript
import { SingletonProto } from 'egg';
import { Pointcut } from 'egg/aop';

@SingletonProto()
export class OrderService {
  @Pointcut(LogAdvice)
  async createOrder(data: any) {
    // 业务逻辑
  }

  // 可以传参给 Advice
  @Pointcut(TransactionAdvice, { adviceParams: { propagation: 'REQUIRED' } })
  async updateOrder(id: string, data: any) {
    // 业务逻辑
  }
}
```

### Crosscut — 批量切入

在 Advice 类上声明切入规则，适合横切多个类/方法：

```typescript
import { Crosscut, Advice, IAdvice, PointcutType } from 'egg/aop';

// 模式 1：指定类和方法
@Crosscut({
  type: PointcutType.CLASS,
  clazz: OrderService,
  methodName: 'createOrder',
})
@Advice()
export class AuditAdvice implements IAdvice {
  async afterReturn(ctx: AdviceContext): Promise<void> {
    // 审计日志
  }
}

// 模式 2：正则匹配
@Crosscut({
  type: PointcutType.NAME,
  className: /.*Service$/i,
  methodName: /^(create|update|delete)/,
})
@Advice()
export class OperationLogAdvice implements IAdvice {
  async around(ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    // 记录所有 Service 的写操作
    return await next();
  }
}

// 模式 3：自定义回调
@Crosscut({
  type: PointcutType.CUSTOM,
  callback: (clazz, method) => {
    return clazz.name.endsWith('Repository') && method !== 'constructor';
  },
})
@Advice()
export class DbMetricsAdvice implements IAdvice {}
```

### 执行顺序

- `@Crosscut` 默认 order: `100`
- `@Pointcut` 默认 order: `1000`
- order 越小越先执行
- 同一方法上多个 Advice 按 order 升序排列

通过 `order` 参数自定义顺序：

```typescript
// Pointcut：第二个参数中设置 order
@Pointcut(LogAdvice, { order: 50 })
async createOrder(data: any) {}

// Crosscut：第二个参数中设置 order
@Crosscut(
  { type: PointcutType.NAME, className: /.*Service$/i, methodName: /.+/ },
  { order: 200 },
)
@Advice()
export class MetricsAdvice implements IAdvice {}
```

---

## 参数透传

同一个 Advice 在不同方法上可能需要不同的行为，通过 `adviceParams` 传参：

```typescript
@Advice()
export class CacheAdvice implements IAdvice {
  async around(ctx: AdviceContext<any, { ttl: number }>, next: () => Promise<any>): Promise<any> {
    const ttl = ctx.adviceParams?.ttl ?? 60;
    // 根据 ttl 实现缓存逻辑
    return await next();
  }
}

@SingletonProto()
export class UserService {
  @Pointcut(CacheAdvice, { adviceParams: { ttl: 3600 } })
  async getUser(id: string) { /* ... */ }

  @Pointcut(CacheAdvice, { adviceParams: { ttl: 60 } })
  async getUserList() { /* ... */ }
}
```

---

## 典型场景

| 场景                        | 推荐方式                 | 说明              |
| --------------------------- | ------------------------ | ----------------- |
| 特定方法加日志/缓存         | `@Pointcut(Advice)`      | 精确控制          |
| 所有 Service 的写操作加审计 | `@Crosscut(NAME)` + 正则 | 批量匹配          |
| 事务包裹                    | `@Pointcut(TxAdvice)`    | around 中管理事务 |
