# BackgroundTaskHelper 测试

## 常见错误

| 错误写法                                           | 正确写法                                                                              | 说明                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 不等待就断言                                       | 用 `mockModuleContextScope`（自动等待）或 `app.backgroundTasksFinished()`（手动等待） | 后台任务异步执行，必须等待完成后再断言               |
| 在 `mockModuleContextScope` 回调内断言后台任务结果 | 在 `mockModuleContextScope` 返回后断言                                                | 回调内任务尚未完成，返回后才会等待完成               |
| 用 `TimerUtil.sleep` 等待                          | 用 `app.backgroundTasksFinished()`                                                    | sleep 时间不确定，`backgroundTasksFinished` 精确等待 |

---

## 使用 mockModuleContextScope

`mockModuleContextScope` 退出时会自动等待所有后台任务完成（内部触发 `doPreDestroy`），scope 退出后直接断言即可：

```typescript
import assert from 'node:assert';
import { app } from '@eggjs/mock/bootstrap';
import { CountService } from '../app/modules/count/CountService.ts';

it('should complete background task', async () => {
  await app.mockModuleContextScope(async (ctx) => {
    const countService = await ctx.getEggObject(CountService);
    // countService 内部通过 backgroundTaskHelper.run() 触发后台任务
    await countService.doSomething();
  });

  // scope 退出后，后台任务已完成，直接断言
  const countService = await app.getEggObject(CountService);
  assert.equal(countService.count, 1);
});
```

## 使用 backgroundTasksFinished

不通过 `mockModuleContextScope` 触发的场景（如 HTTP 接口测试），scope 退出的自动等待机制不适用，需要手动调用 `app.backgroundTasksFinished()` 等待所有后台任务完成后，再做断言：

```typescript
import assert from 'node:assert';
import { app } from '@eggjs/mock/bootstrap';
import { CountService } from '../app/modules/count/CountService.ts';

it('should complete background task', async () => {
  await app.httpRequest()
    .get('/api/trigger-task')
    .expect(200);

  // 等待后台任务完成
  await app.backgroundTasksFinished();

  const countService = await app.getEggObject(CountService);
  assert.equal(countService.count, 1);
});
```
