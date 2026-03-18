# Middleware 中间件指南

## 常见错误

| 错误写法                                   | 正确写法                           | 说明                                            |
| ------------------------------------------ | ---------------------------------- | ----------------------------------------------- |
| `import { Middleware } from '@eggjs/tegg'` | `import { Middleware } from 'egg'` | Middleware 从 `egg` 导入                        |
| `import { Advice } from 'egg'`             | `import { Advice } from 'egg/aop'` | AOP 装饰器从 `egg/aop` 导入                     |
| `@Middleware(funcMw, AdviceClass)`         | 分开写两个 `@Middleware`           | 同一个 `@Middleware()` 中不能混用函数式和 AOP   |
| AOP Advice 中用实例属性存请求级状态        | 使用 `ctx.set()`/`ctx.get()`       | Advice 默认 Singleton，实例属性会被并发请求共享 |
| 把中间件文件放在 `app/middleware/`         | 放在模块目录下                     | 函数式中间件放在模块中，通过 import 引用        |

---

## 两种中间件模式

Egg 的 `@Middleware` 装饰器支持两种中间件写法，根据传入参数类型自动识别：

- **AOP 写法（推荐）**：使用 `@Advice` 类，支持 `@Inject` 注入 Proto 依赖，拥有丰富的生命周期钩子
- **函数式写法（旧版兼容）**：标准 Koa 中间件函数，需要从 `ctx` 对象上手动获取依赖

新项目应优先使用 AOP 写法。函数式写法主要用于兼容旧的 egg 中间件或非常简单的场景。

---

## 实现中间件

### AOP 写法（推荐）

使用 `@Advice()` 装饰器定义类，实现 `IAdvice` 的 `around` 方法，写法与 Koa 中间件一致（`next` 调用目标方法）。Advice 本身是 Proto，支持 `@Inject` 注入依赖。`around` 中可以修改入参（`ctx.args`）和返回值：

```typescript
// app/modules/foo/advice/LogAdvice.ts
import { AccessLevel, Inject, Logger } from 'egg';
import { Advice, IAdvice, AdviceContext } from 'egg/aop';

// 跨模块使用时需设置 accessLevel: AccessLevel.PUBLIC
@Advice({ accessLevel: AccessLevel.PUBLIC })
export class LogAdvice implements IAdvice {
  @Inject()
  logger: Logger;

  async around(ctx: AdviceContext, next: () => Promise<any>): Promise<any> {
    // 修改入参：ctx.args 对应控制器方法的参数列表
    // ctx.args[0] = sanitize(ctx.args[0]);

    const start = Date.now();
    const result = await next();
    this.logger.info('%s cost %dms', ctx.method, Date.now() - start);

    // 修改返回值：直接返回新的值即可
    return { success: true, data: result };
  }
}
```

### 函数式写法（旧版兼容）

标准 Koa 中间件函数，签名为 `(ctx: Context, next: Next) => Promise<void>`。旧版 egg 写法，无法使用 `@Inject`，需要从 `ctx` 对象上手动获取依赖：

```typescript
// app/modules/foo/middleware/count.ts
import type { Context, Next } from 'egg';

export async function countMw(ctx: Context, next: Next): Promise<void> {
  const start = Date.now();
  await next();
  ctx.set('X-Response-Time', `${Date.now() - start}ms`);
}
```

---

## 应用中间件

通过 `@Middleware()` 装饰器将中间件应用到控制器，支持类级别和方法级别：

```typescript
// app/modules/foo/FooController.ts
import { HTTPController, HTTPMethod, HTTPMethodEnum, Middleware } from 'egg';
import { LogAdvice } from '../common/advice/LogAdvice.ts';
import { countMw } from './middleware/count.ts';

@HTTPController({ path: '/api' })
@Middleware(LogAdvice)  // 类级别：所有方法都会执行
export class FooController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/profile' })
  @Middleware(countMw)  // 方法级别：仅此方法执行
  async getProfile() {
    return { name: 'test' };
  }
}
```

---

## 执行顺序

遵循洋葱模型，类级别先执行，方法级别后执行：

```typescript
@Middleware(globalMw)
export class FooController {
  // 进：globalMw → methodMw → hello()
  // 出：hello() → methodMw → globalMw
  @Middleware(methodMw)
  async hello() {}

  // 多个 @Middleware 从上到下执行
  // 进：globalMw → mw3 → mw2 → mw1 → multiple()
  // 出：multiple() → mw1 → mw2 → mw3 → globalMw
  @Middleware(mw1)
  @Middleware(mw2)
  @Middleware(mw3)
  async multiple() {}
}
```

**若混用函数式和 AOP 中间件，所有函数式中间件（无论类级别还是方法级别）会先于所有 AOP 中间件执行。** 即函数式和 AOP 分属两个独立的执行阶段，函数式阶段在前，AOP 阶段在后：

```typescript
@Middleware(countMw)       // 函数式 - 类级别
@Middleware(LogAdvice)     // AOP - 类级别
export class FooController {
  @Middleware(timeMw)      // 函数式 - 方法级别
  @Middleware(AuthAdvice)  // AOP - 方法级别
  async hello() {}
}

// 实际执行顺序：
// countMw → timeMw → LogAdvice → AuthAdvice → hello()
// （先所有函数式，再所有 AOP，与装饰器书写顺序无关）
```
