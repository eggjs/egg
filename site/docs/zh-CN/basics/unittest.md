---
title: 单元测试
---

# 单元测试

## 快速开始

```typescript
import path from 'node:path';
import assert from 'node:assert';
import { app } from 'egg-mock/bootstrap';
import { FooService } from '../app/foo';

describe('test/xxx.test.ts', () => {
  let fooService: FooService;
  beforeEach(async () => {
    fooService = await app.getEggObject(FooService);
  });

  it('should work', async () => {
    const result = await fooService.foo();
    assert(result);
  });
});
```

### 工具链命令

```bash
$ egg-bin test
```

## Mock 方法

### Context

在单测中需要获取 egg Context 时，可以使用以下 API。

```typescript
export interface Application {
  currentContext: Context;
}
```

使用例子

```typescript
import { app } from 'egg-mock/bootstrap';

describe('test', () => {
  let ctx;

  it('test', () => {
    ctx = app.currentContext;
    // do something with ctx
  });
});
```

### 获取对象实例

在单测中需要获取 Module 中的对象实例时，可以使用以下 API

```typescript
export interface Application {
  /**
   * 通过一个类来获取实例
   * 注：app.getEggObject 只能获取 Singleton 实例
   */
  getEggObject<T>(clazz: EggProtoImplClass<T>): Promise<T>;
}

export interface Context {
  /**
   * 通过一个类来获取实例
   * 注：ctx.getEggObject 可以获取 Singleton/Context 实例
   */
  getEggObject<T>(clazz: EggProtoImplClass<T>): Promise<T>;
}
```

使用例子

```typescript
// HelloService.ts
@SingletonProto()
export class HelloService {
  async foo() {
    // do something
  }
}

// xxx.test.ts
import { app } from 'egg-mock/bootstrap';
import { HelloService } from '../app/module/foo/HelloService.ts';

describe('test', () => {
  it('test', async () => {
    const helloService = await app.getEggObject(HelloService);
    await helloService.foo();
  });
});
```

### Mock 对象方法

在单测中如果需要 mock 掉 Module 中的某些方法时，可以 mock 掉原型来测试，比如`mock(XXX.prototype, 'xxx', 'xxx')`

```typescript
// HelloService.ts
@SingletonProto()
export class HelloService {
  async hello() {
    // do something
  }
}

// FooService.ts
@SingletonProto()
export class FooService {
  @Inject()
  helloService: HelloService;

  async foo() {
    return this.helloService.hello();
  }
}

// xxx.test.ts
import { app, mm } from 'egg-mock/bootstrap';
import assert from 'node:assert/strict';
import { HelloService } from '../app/module/foo/HelloService.ts';
import { FooService } from '../app/module/foo/FooService.ts';

describe('test', () => {
  it('test', () => {
    mm(HelloService.prototype, 'hello', async () => {
      return '123';
    });
    const fooService = await app.getEggObject(FooService);
    assert.equal(await fooService.foo(), '123');
  });
});
```
