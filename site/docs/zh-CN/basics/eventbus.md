---
title: 消息中枢
---

# EventBus

## 使用场景

在业务开发中，经常会需要解耦的异步操作，简单做法可以通过 `backgroundTaskHelper` 执行。但这种方法无法实现代码间的解耦，需要在 `backgroundTask` 的回调中编写异步逻辑。这时引入事件更合适。

## 代码对比

### 使用 backgroundTaskHelper

```typescript
import { BackgroundTaskHelper } from 'egg';

export class TriggerService {
  @Inject()
  private backgroundTaskHelper: BackgroundTaskHelper;

  @Inject()
  private fooService;

  @Inject()
  private barService;

  async trigger() {
    this.backgroundTaskHelper.run(async () => {
      // do the background task
      this.fooService.call();
      this.barService.call();
    });
  }
}
```

### 使用 EventBus

可以很明显的看到对比业务触发的地方不会再耦合其他的业务逻辑。可以没有负担的进行扩展。

```typescript
import { Inject, EventBus, Event } from 'egg';

export class TriggerService {
  @Inject()
  private eventBus: EventBus;

  async trigger() {
    this.eventBus.emit('hello');
  }
}

@Event('hello')
class FooHelloHandler {
  handle() {
    // ...
  }
}

@Event('hello')
class BarHelloHandler {
  handle() {
    // ...
  }
}
```

## 使用

### 定义事件

通过 ts 强大的类型合并功能，我们可以进行事件以及参数的强类型检查。

```typescript
// 这行必须有，否则下面的 declare 会把原始的 module 覆盖
import 'egg';

declare module 'egg' {
  interface Events {
    // 自定义事件
    // property 即为事件名称
    // property 的值会约束消费的函数申明
    hello: (message: string) => Promise<void>;
  }
}
```

### 触发事件

通过注入 eventBus 即可触发。

```typescript
import { SingletonProto, Inject, EventBus } from 'egg';

@SingletonProto()
export class FooProducer {
  @Inject()
  private eventBus: EventBus;

  trigger() {
    this.eventBus.emit('hello', '01');
  }
}
```

会神奇地发现 emit 会及时出现正确的类型提示

![](https://mdn.alipayobjects.com/huamei_1jxgeu/afts/img/cwwCRpOnomgAAAAARSAAAAgADpOHAQFr/original)

### 消费事件

为一个类添加 Event 注解，即可实现事件消费。

```typescript
import { EggLogger, Event, Inject } from 'egg';

// ts 会检查事件是否在 Events 中存在
@Event('hello')
export class FooHandler {
  @Inject()
  private logger: EggLogger;

  // ts 会检查函数签名是否与 Events 中对应的事件相同
  async handle(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }
}
```

### 消费多个事件

一个类添加多次 Event 注解，可以对多个事件进行消费。

并且可以通过 EventContext 注解，注入 EventContext。（可选）

```typescript
import { EggLogger, Event, Inject, EventContext } from 'egg';

// ts 会检查事件是否在 Events 中存在，并且会检查 handle 的参数是否符合对应事件的类型定义
@Event('hello')
@Event('hi')
export class Handler {
  async handle(@EventContext() ctx: IEventContext, msg: string): Promise<void> {
    console.log('eventName: ', ctx.eventName);
    console.log('msg: ', msg);
  }
}

// 不需要感知 handle 的事件则无需注入
@Event('hello')
@Event('hi')
export class Handler {
  async handle(msg: string): Promise<void> {
    console.log('msg: ', msg);
  }
}
```

```typescript
export interface IEventContext {
  eventName: keyof Events;
}
```

EventContext 只能修饰 handle 方法的第一个参数，ts 会对此进行类型校验。

### 单测

通过 `app.getEventWaiter()` 方法获得的 `eventWaiter` 可以简单的等待事件触发。

```typescript
it('msg should work', async () => {
  ctx = await app.mockModuleContext();
  const fooProducer = await ctx.getEggObject(FooProducer);
  let msg: string | undefined;
  // FooHandler 会在一个独立的上下文中实例化
  // 所以此处需要 mock prototype
  mm(FooHandler.prototype, 'handle', (m) => {
    msg = m;
  });
  const eventWaiter = await app.getEventWaiter();
  // 通过 await 接口来等待事件被触发
  // 不用再写 sleep
  const helloEvent = eventWaiter.await('hello');
  fooProducer.trigger('01');
  await helloEvent;
  assert.equal(msg, '01');
});
```
