---
title: 对象生命周期
order: 7
---

## 使用场景

需要对对象的生命周期进行管理，如在对象构造、依赖注入完成后进行异步的初始化，在对象销毁时需要将资源同步的销毁等情况。

## 快速开始

```ts
import {
  LifecyclePostConstruct,
  LifecyclePreInject,
  LifecyclePostInject,
  LifecycleInit,
  LifecyclePreDestroy,
  LifecycleDestroy,
  SingletonProto,
  AccessLevel,
} from 'egg';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'helloInterface',
})
export class HelloService {
  @LifecyclePostConstruct()
  protected async _postConstruct() {
    // 对象的 construct 调用结束后
    console.log('对象构造完成');
  }

  @LifecyclePreInject()
  protected async _preInject() {
    // 在依赖将要注入前，注意构造器注入的模式不会执行这个方案
    console.log('依赖将要注入');
  }

  @LifecyclePostInject()
  protected async _postInject() {
    // 在依赖注入后，注意构造器注入的模式不会执行这个方案
    console.log('依赖注入完成');
  }

  @LifecycleInit()
  protected async _init() {
    // 在 construct 调用和依赖注入后，一般情况都会使用这个方法
    console.log('执行一些异步的初始化过程');
  }

  @LifecyclePreDestroy()
  protected async _preDestroy() {
    // 在对象将要被释放前调用
    console.log('对象将要释放了');
  }

  @LifecycleDestroy()
  protected async _destroy() {
    // 在对象被释放后调用
    console.log('执行一些释放资源的操作');
  }

  async hello(user: User) {
    return `hello, ${user.name}`;
  }
}
```

## 示例

### 自定义初始化

通过 `CustomUserInfo` 实现自定义的用户信息，在 `init` 生命周期中调用了 rpc 获取用户详细信息。

```ts
import { Inject, ContextProto, AccessLevel, LifecycleInit, User } from 'egg';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class CustomUserInfo {
  mobile: string;
  profile: UserProfile;

  @Inject()
  private readonly userFacade: UserFacade;
  @Inject()
  private readonly user?: User;

  @LifecycleInit()
  protected async _init() {
    if (!this.user?.userId) {
      throw new Error('非法用户请求');
    }
    const profile = await this.userFacade.findByUserId(this.user.userId);
    this.profile = profile;
    this.mobile = profile.mobile;
  }
}
```

### 释放资源

```ts
import { ContextProto, AccessLevel, LifecyclePreDestroy } from 'egg';
import { setInterval, clearInterval } from 'node:timers';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ContextTimer {
  timer: NodeJS.Timeout;

  constructor() {
    this.timer = setInterval(() => {
      // ...
    }, 1000);
  }

  @LifecyclePreDestroy()
  protected async _preDestroy() {
    // 在对象释放前，释放 timer
    clearInterval(this.timer);
  }
}
```
