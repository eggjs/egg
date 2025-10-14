---
title: 异步任务
---

# BackgroundTask

## 使用场景

在业务逻辑执行完毕，请求返回后，框架会将本次请求的上下文信息进行释放，以避免造成内存泄漏。若在请求返回后，仍然需要执行一些日志上报等异步逻辑时，可以使用框架提供的 `backgroundTaskHelper` 工具类来执行异步任务，以主动通知框架不要立即释放上下文信息。

## 使用方式

在需要执行异步任务的地方，注入 `backgroundTaskHelper` 对象，然后调用 `run` 方法执行异步逻辑。

```typescript
import { BackgroundTaskHelper, Inject, SingletonProto } from 'egg';

@SingletonProto()
export class TriggerService {
  @Inject()
  private backgroundTaskHelper: BackgroundTaskHelper;
  
  @Inject()
  private fooService: any;
  
  @Inject()
  private barService: any;
  
  async trigger() {
    this.backgroundTaskHelper.run(async () => {
      // do the background task
      this.fooService.call();
      this.barService.call();
    });
  }
}
```

## 超时时间

框架不会无限的等待异步任务执行，默认情况下，5s 后如果异步任务还没有完成，则会放弃等待，开始执行释放过程。若特殊情况下，确实需要执行长耗时的异步任务，可手动调整超时时间，通过 `backgroundTaskHelper.timeout` 来设置超时时间，单位为毫秒。超时时间为 context 级别设置，若同一个请求中，多次设置超时时间，则以最后一次设置的为准。

```typescript
import { BackgroundTaskHelper, Inject, SingletonProto } from 'egg';

@SingletonProto()
export class TriggerService {
  @Inject()
  private backgroundTaskHelper: BackgroundTaskHelper;

  async trigger() {
    this.backgroundTaskHelper.timeout = 10000;
    this.backgroundTaskHelper.run(async () => {
      // do the background task
    });
  }
}
```

## 其他方案

- 标准应用中，还可以使用 [EventBus](./eventbus) 来实现异步任务的处理。

