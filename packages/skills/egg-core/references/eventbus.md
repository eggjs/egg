# EventBus 事件总线指南

## 常见错误

| 错误写法                                         | 正确写法                                    | 说明                                             |
| ------------------------------------------------ | ------------------------------------------- | ------------------------------------------------ |
| `import { EventBus } from '@eggjs/tegg'`         | `import { EventBus } from 'egg'`            | 统一从 `egg` 导入                                |
| `import { Event } from '@eggjs/tegg'`            | `import { Event } from 'egg'`               | 装饰器也从 `egg` 导入                            |
| 在 handler 的 `handle` 方法中直接访问请求上下文  | 使用 `@EventContext()` 注入 `IEventContext` | handler 运行在独立的上下文中，不是触发者的上下文 |
| `@Event('hello')` 但没有声明 Events 接口         | 先在 `declare module 'egg'` 中声明事件类型  | 不声明会导致类型检查报错                         |
| handler 的 `handle` 方法签名与 Events 声明不一致 | 确保参数类型与 Events 中定义一致            | TypeScript 会检查签名是否匹配                    |

---

## 使用步骤

### 1. 声明事件类型

在模块中创建类型声明文件，定义事件名称和参数签名：

```typescript
// app/myModule/event.ts
import 'egg';

declare module 'egg' {
  interface Events {
    orderCreated: (orderId: string, userId: string) => void;
    paymentCompleted: (orderId: string, amount: number) => void;
  }
}
```

**注意：** 文件开头必须有 `import 'egg'`，否则 `declare module` 会覆盖而非合并模块声明。

### 2. 触发事件

通过 `@Inject()` 注入 `EventBus` 或 `ContextEventBus`，调用 `emit()` 触发事件：

```typescript
import { SingletonProto, Inject, EventBus, AccessLevel } from 'egg';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class OrderService {
  @Inject()
  private eventBus: EventBus;

  async createOrder(userId: string, items: Item[]): Promise<string> {
    const orderId = await this.saveOrder(userId, items);
    // 触发事件，不阻塞当前流程
    this.eventBus.emit('orderCreated', orderId, userId);
    return orderId;
  }
}
```

`emit()` 的参数类型由 Events 接口约束，TypeScript 会自动提示和校验。

### 3. 消费事件

用 `@Event()` 装饰器标记 handler 类。handler 必须实现 `handle` 方法，参数签名与 Events 声明一致：

```typescript
import { Event, Inject } from 'egg';
import type { EggLogger } from 'egg';

@Event('orderCreated')
export class OrderNotificationHandler {
  @Inject()
  private logger: EggLogger;

  async handle(orderId: string, userId: string): Promise<void> {
    this.logger.info('[OrderNotification] order %s created by user %s', orderId, userId);
    // 发送通知等业务逻辑
  }
}
```

**handler 的关键特性：**

- handler 运行在独立的上下文中，不是触发者的上下文
- 同一事件可以有多个 handler，它们并行执行
- handler 文件放在模块目录中，框架自动扫描和注册

### 4. 消费多个事件

一个 handler 可以处理多个事件，通过 `@EventContext()` 获取事件上下文来区分：

```typescript
import { Event, EventContext, type IEventContext } from 'egg';

@Event('orderCreated')
@Event('paymentCompleted')
export class AuditLogHandler {
  async handle(@EventContext() ctx: IEventContext, ...args: unknown[]): Promise<void> {
    console.log('event:', ctx.eventName, 'args:', args);
  }
}
```

`@EventContext()` 只能修饰 `handle` 方法的第一个参数。不需要区分事件时可以省略。

---

## Cork/Uncork 事件缓冲

当需要在一个操作中触发多个事件，但希望它们在操作全部完成后才被处理时，使用 cork/uncork：

```typescript
import { ContextProto, Inject, type ContextEventBus } from 'egg';

@ContextProto()
export class BatchService {
  @Inject()
  private eventBus: ContextEventBus;  // 注意：cork/uncork 需要 ContextEventBus

  async processBatch(items: string[]): Promise<void> {
    this.eventBus.cork();     // 开始缓冲，事件不会立即派发

    for (const item of items) {
      this.eventBus.emit('orderCreated', item, 'batch-user');
    }

    this.eventBus.uncork();   // 释放缓冲，所有事件一次性派发
  }
}
```

**Cork/Uncork 行为：**

- 支持嵌套调用 — 内层 uncork 不会释放事件，只有最外层 uncork 才会
- `ContextEventBus` 的 cork/uncork 自动管理 corkId，无需手动指定
- cork 期间 emit 的事件会被暂存，uncork 后按顺序派发

---

## 单元测试

使用 `app.getEventWaiter()` 等待事件被处理完成，避免使用 `sleep`：

```typescript
import { describe, it, expect } from 'vitest';
import { mm, type MockApplication } from '@eggjs/mock';
import { OrderService } from './path/to/OrderService.ts';

describe('order events', () => {
  let app: MockApplication;

  it('should emit orderCreated event', async () => {
    await app.mockModuleContextScope(async (ctx) => {
      const orderService = await ctx.getEggObject(OrderService);
      const eventWaiter = await app.getEventWaiter();

      // 准备等待事件
      const eventPromise = eventWaiter.await('orderCreated');

      // 触发业务逻辑
      await orderService.createOrder('user1', []);

      // 等待事件处理完成
      await eventPromise;

      // 断言 handler 的执行结果
    });
  });
});
```

**EventWaiter API：**

- `eventWaiter.await('eventName')` — 等待指定事件触发
- `eventWaiter.awaitFirst('event1', 'event2')` — 等待多个事件中最先触发的一个

**注意：** `eventWaiter.await()` 必须在 `emit()` 之前调用（先注册等待，再触发事件），否则可能错过事件。
