# BackgroundTask 异步任务指南

## 常见错误

| 错误写法                                                    | 正确写法                                        | 说明                                                      |
| ----------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| `setTimeout(() => { ... }, 0)`                              | `backgroundTaskHelper.run(async () => { ... })` | setTimeout 执行时上下文已释放，会导致访问已销毁对象的错误 |
| `setImmediate(() => { ... })`                               | `backgroundTaskHelper.run(async () => { ... })` | 同上，框架不会等待 setImmediate 的回调                    |
| `process.nextTick(() => { ... })`                           | `backgroundTaskHelper.run(async () => { ... })` | 同上                                                      |
| 在 Service 中 `await` 后台任务                              | 直接调用 `run()` 不 await                       | `run()` 是"发射后不管"，不返回 Promise                    |
| `import { BackgroundTaskHelper } from '@eggjs/tegg/helper'` | `import { BackgroundTaskHelper } from 'egg'`    | 统一从 `egg` 导入，不要从 `@eggjs/tegg` 子路径导入        |

---

## 使用方式

### 基本用法

通过 `@Inject()` 注入 `BackgroundTaskHelper`，调用 `run()` 方法。`run()` 接受一个异步函数，在请求返回后执行。

```typescript
import { BackgroundTaskHelper, Inject, SingletonProto, AccessLevel } from 'egg';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class MetricsService {
  @Inject()
  private backgroundTaskHelper: BackgroundTaskHelper;

  async reportAfterResponse(data: Record<string, unknown>) {
    // run() 是非阻塞的，调用后立即返回
    this.backgroundTaskHelper.run(async () => {
      // 这里的代码在 HTTP 响应发送后执行
      // 可以安全访问注入的服务和上下文
      await this.sendMetrics(data);
    });
  }

  private async sendMetrics(data: Record<string, unknown>) {
    // 实际上报逻辑
  }
}
```

---

## 超时配置

框架默认等待 5 秒，超时后放弃等待并释放上下文。

### 按请求调整超时

```typescript
this.backgroundTaskHelper.timeout = 10000; // 10 秒
this.backgroundTaskHelper.run(async () => {
  await heavyWork();
});
```

注意：timeout 是 context 级别的设置，同一请求中多次设置以最后一次为准。

### 全局配置

```typescript
// config/config.default.ts
export default {
  backgroundTask: {
    timeout: 10000, // 全局默认 10 秒
  },
};
```

### 无限等待

```typescript
// 不推荐在生产环境使用，除非确定任务一定会完成
this.backgroundTaskHelper.timeout = Infinity;
```

---

## 错误处理

BackgroundTaskHelper 内部会捕获所有错误并记录日志，**不会**抛出异常或影响其他后台任务。

```typescript
this.backgroundTaskHelper.run(async () => {
  // 即使这里抛出异常，也不会影响其他后台任务或框架
  throw new Error('something went wrong');
  // 错误会被记录为: [BackgroundTaskHelper] background throw error: something went wrong
});

// 如果需要自定义错误处理
this.backgroundTaskHelper.run(async () => {
  try {
    await unreliableOperation();
  } catch (e) {
    // 自定义错误处理：重试、告警等
    await this.alertService.notify(e);
  }
});
```

---

## 原理

请求处理完成后，框架会立即释放上下文（防止内存泄漏）。如果用 `setTimeout` 等方式在上下文释放后访问注入的服务，会因为上下文已销毁而出错。

BackgroundTaskHelper 的作用是：

1. 告诉框架"先不要释放上下文"
2. 排队执行异步任务
3. 等待完成（或超时）
4. 然后再释放上下文

这就是为什么必须用 `backgroundTaskHelper.run()` 而不是 `setTimeout` — 后者绕过了框架的上下文生命周期管理。
