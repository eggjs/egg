# EventBus 测试

## 常见错误

| 错误写法                         | 正确写法                                           | 说明                                         |
| -------------------------------- | -------------------------------------------------- | -------------------------------------------- |
| 先 emit 再 `eventWaiter.await()` | 先 `eventWaiter.await()` 再触发业务逻辑            | await 注册监听器，必须在事件发出前           |
| 不等待事件处理完成就断言         | 使用 `eventWaiter.await('eventName')` 等待后再断言 | handler 异步执行，不等待则断言时可能尚未完成 |

---

## 基本测试模式

使用 `app.getEventWaiter()` 等待事件被处理完成：

```typescript
import assert from 'node:assert';
import { app, mm } from '@eggjs/mock/bootstrap';
import { HelloService } from '../app/modules/hello/HelloService.ts';
import { HelloHandler } from '../app/modules/hello/HelloHandler.ts';

describe('EventBus', () => {
  it('should handle event', async () => {
    // mock handler 捕获调用参数
    const mockFn = async (msg: string) => {};
    mm(HelloHandler.prototype, 'handle', mockFn);

    await app.mockModuleContextScope(async (ctx) => {
      const helloService = await ctx.getEggObject(HelloService);
      const eventWaiter = await app.getEventWaiter();

      // 1. 先注册等待（必须在 emit 之前）
      const eventPromise = eventWaiter.await('helloEgg');

      // 2. 触发业务逻辑（内部会 emit 事件）
      helloService.hello();

      // 3. 等待 handler 执行完成
      await eventPromise;
    });

    // 4. 验证 handler 被调用及参数
    assert.equal(mockFn.called, 1);
    assert.deepStrictEqual(mockFn.lastCalledArguments, ['hello']);
  });
});
```
