---
title: 依赖注入
---

# Proto
在领域驱动开发中，一般我们会将逻辑放到 Service 中，在 egg 里，通过 Proto 来实现。

Proto 提供了可配置相关信息：
- 实例化方式：每次请求实例化/全局单例
- 访问级别：module 外是否可访问
- 实例化名称

## 实例化方式

包含了 [ContextProto](./contextproto) 和 [SingletonProto](./singletonproto) 两种形式，具体细节可以查看相关文档。

## 实例化名称

十分关键，决定 [@Inject](../inject) 注入的实例应该是哪个。默认会把 Proto 类的首字母转为小写，如 UserAdapter 会转换为 userAdapter。如果有不符合预期的可以手动指定，比如：

```ts
// MISTAdapter 的实例名称即为 mistAdapter
@SingletonProto({ name: 'mistAdapter' })
class MISTAdapter {}
```

## 访问级别

Module 内所有的原型都能被同 Module 内的原型依赖（`@Inject`），只有 `accessLevel: PUBLIC`的原型可以被其它 Module 所访问。默认访问级别是 `PRIVATE`

```ts
app root dir
└── app
    └── module
        ├── fooModule
        │   ├── Private.ts
        │   ├── Public.ts
        │   └── Access.ts  // 可以 Inject Private/Public
        └── barModule  
            └── Access.ts  // 只可以 Inject Public
```

:::warning
Module 内逻辑应尽可能高内聚，只对外暴露必要的接口
并且一旦暴露意味着会产生依赖，接口代码变更需要自行考虑向下兼容问题
:::

## SingletonProto

### 定义

和 `ContextProto` 类似，整个应用生命周期只会实例化一个 `SingletonProto` 。

推荐默认使用 `SingletonProto`，可以提升应用性能，并且可以在 `SingletonProto` 里面注入 `ContextProto` 对象。

```ts
@SingletonProto({
  // 原型的实例化名称，非必传
  name?: string;
              
  // 对象是在 module 内可访问还是全局可访问
  // 默认值为 AccessLevel.PRIVATE
  accessLevel?: AccessLevel;
})
```

### 示例

```ts
// service.ts
import { SingletonProto } from 'egg';

@SingletonProto()
export class HelloService {
  async hello(): Promise<string> {
    return 'hello';
  }
}

@SingletonProto({
  name: 'worldInterface'
})
export class WorldService {
  async world(): Promise<string> {
    return 'world!';
  }
}
```

## ContextProto

### 定义

每次请求都会实例化一个 ContextProto。
:::info
绝大多数 service 都是无状态的，本身不会存储请求上下文，这种情况推荐使用 [SingletonProto](./singletonproto) 即可。因为只需要全局初始化一个对象，而不需要每个请求都初始化一个对象（会导致应用性能下降）。
对于需要存储请求上下文信息，并在多个 service 间共享的场景，则可以使用 ContextProto，以保证不同请求获取的对象是隔离的。
:::

```ts
enum AccessLevel {
  // 仅 module 内可访问
  PRIVATE = 'PRIVATE',
  // 全局可访问
  PUBLIC = 'PUBLIC',
}

@ContextProto({
  // 原型的实例化名称，非必传
  name?: string;
              
  // 对象是在 module 内可访问还是全局可访问
  // 默认值为 AccessLevel.PRIVATE
  accessLevel?: AccessLevel;
})
```

### 示例

```ts
// service.ts
import { ContextProto } from 'egg';

@ContextProto()
export class HelloService {
  async hello(): Promise<string> {
    return 'hello';
  }
}

@ContextProto({
  name: 'worldInterface',
})
export class WorldService {
  async world(): Promise<string> {
    return 'world!';
  }
}
```

如何被注入使用

```ts
import { Inject, ContextProto } from 'egg';
import { HelloService, WorldService } from './service.ts';

@ContextProto()
export class UseProtoDemo {
  @Inject()
  helloService: HelloService;
  
  @Inject()
  worldInterface: WorldService;
  
  async say(): Promise<string> {
    return this.helloService.hello() + ',' + this.worldInterface.world();
  }
}
```

<style>
.ne-alert {
    display: block;
    width: 100%;
    margin: 4px 0;
    padding: 10px;
    border-radius: 4px;
}
.ne-alert-background {
    background-color: rgba(246, 225, 172, 0.5);
}
.ne-error-background {
    background-color: rgba(248, 206, 211, 0.5);
}
.context-p-mini-top {
    margin-top: 8px;
}
.context-no-bottom {
    padding-bottom: 0px;
    margin-bottom: 0px;
}
</style>

# Inject

## 定义

原型中可以依赖其他的原型，或者 egg 中的对象。通过 `@Inject` 注解来实现依赖注入

```ts
@Inject(param?: {
  // 注入对象的名称，在某些情况下一个原型可能有多个实例
  // 比如说 egg 的 logger
  // 默认为属性名称
  name?: string;
  // 注入原型的名称
  // 在某些情况不希望注入的原型和属性使用一个名称
  // 默认为属性名称
  proto?: string;
})
```

## 示例

```ts
import { Inject, SingletonProto, EggLogger } from 'egg';

@SingletonProto()
export class HelloService {
  @Inject()
  fooService: FooService; // 注入其它原型实例
  
  @Inject()
  logger: EggLogger; // 注入 egg 对象
  
  async hello(user: User): Promise<string> {
    this.logger.info(`[HelloService] hello ${this.fooService.hello()}`);
  }
}
```

## 使用说明

Inject 在使用时有一些点需要注意：
- 原型之间不允许有循环依赖，比如 Proto A - inject -> Proto B - inject- > Proto A
- 类似原型之间不允许有循环依赖，module 之间也不能有循环依赖
- 一个 module 内不能有实例化方式和名称同时相同的原型
- <font color=red>不可以注入 egg 的 ctx/app，用什么注入什么</font>


### Inject name 的作用

可以让注入进来的实例名称和原型实例化不一样，这在使用别名时会比较有用

```ts
/*** 定义原型 ***/
@SingletonProto()
export class HelloService {
  async hello(): Promise<string> {
    return 'hello';
  }
}

@SingletonProto({
  name: 'worldInterface'
})
export class WorldService {
  async world(): Promise<string> {
    return 'world!';
  }
}

/*** 注入原型 ***/
@SingletonProto()
class Foo {
  @Inject()
  helloService: HelloService;
  
  @Inject({ name: 'helloService' })
  aliasHelloService: HelloService;  // 等价于上面的 helloService
  
  @Inject({ name: 'worldInterface' })
  worldService: WorldService;
}
```

### Inject 类型的作用

注入依赖的是 proto name 而不是类型，所以下面的代码照样可以运行

```ts
import { Inject, SingletonProto } from 'egg';

@SingletonProto()
class Foo {
  @Inject()
  drm: any; // 类型定义为 any 照样可以注入 Egg Context 上的 drm
}
```

那么这里类型的作用仅仅是 Typescript 的类型提示（比如设置成 any，只是缺失了 drm sdk 的 API 提示）

## 兼容 Egg

Module 会自动去遍历 Context/Application 对象，获取其所有的属性，<strong>所有的属性</strong>都可以进行无缝的注入，比如下面常见的例子

### 注入 Egg 配置

```ts
import { Inject, SingletonProto, EggAppConfig } from 'egg';

@SingletonProto()
class Foo {
  @Inject()
  config: EggAppConfig;
  
  bar() {
    console.log('current env is %s', this.config.env);
  }
}

```

### 注入 logger

专为 logger 做了优化，可以直接注入 custom logger

```ts
// config.ts
export default {
  customLogger: {
    fooLogger: {
      file: 'foo.log',
    }
  }
}
```

代码中可以直接注入:

```ts
import { Inject, SingletonProto, EggLogger } from 'egg';

@SingletonProto()
class FooService {
  // 注入 ${appname}-web.log
  @Inject()
  logger: EggLogger;
  
  // 注入 egg-web.log
  @Inject()
  coreLogger: EggLogger;
  
  // 注入 customLogger 名字为 fooLogger
  @Inject()
  fooLogger: EggLogger;
}
```

### 注入 service

:::warning
强烈建议把 egg service 的代码通过 Proto 重新封装再注入，对于已有模式的 service，可以通过下面的方式引入
:::

```ts
import { EggLogger, Service, Inject, SingletonProto } from 'egg';

@SingletonProto()
class FooService {
  // 注入整个 ctx.service，再获取对应需要的 xxxService
  @Inject()
  service: Service;
  
  get xxxService() {
    return this.service.xxxService;
  }
}
```


### 注入 httpclient
```ts
import { Inject, SingletonProto, EggHttpClient } from 'egg';

@SingletonProto()
class Foo {
  @Inject()
  httpclient: EggHttpClient;
  
  async bar() {
    await this.httpclient.request('https://alipay.com');
  }
}
```

### 注入 Egg 的方法

由于 Module 注入时，只可以注入对象，不能注入方法，如果需要使用现有 Egg 的方法，就需要对方法进行一定的封装。

举个例子：假设 Context 上有一个方法是 `getHeader` ，在 module 中使用这个方法需要如何封装。

```ts
// extend/context.ts
export default {
  getHeader() {
    return '23333';
  }
}

```

先将方法封装成一个对象。

```ts
// HeaderHelper.ts
class HeaderHelper {
  constructor(ctx) {
    this.ctx = ctx;
  }
  
  getHeader(): string {
    return this.ctx.getHeader();
  }
}
```

再将对象放到 Context 扩展上即可。

```ts
// extend/context.ts
const HEADER_HELPER = Symbol('context#headerHelper');

export default {
  get headerHelper() {
    if (!this[HEADER_HELPER]) {
      this[HEADER_HELPER] = new HeaderHelper(this);
    }
    return this[HEADER_HELPER]
  }
}
```

## module 内原型名称冲突

### 定义

一个 module 内，有两个原型，原型名相同，实例化不同，这时直接 Inject 是不行的，module 无法理解具体需要哪个对象。这时就需要告知 module 需要注入的对象实例化方式是哪种。

```ts
@InitTypeQualifier(initType: ObjectInitType)
```

### 示例
```ts
import { EggLogger, Inject, InitTypeQualifier, ObjectInitType, SingletonProto } from 'egg';

@SingletonProto()
export class HelloService {
  @Inject()
  // 明确指定实例化方式为 CONTEXT 的 logger
  @InitTypeQualifier(ObjectInitType.CONTEXT)
  logger: EggLogger;
}
```

## module 间原型名称冲突

### 定义

可能多个 module 都实现了名称为 HelloService 的原型，需要明确的告知 module 需要注入的原型来自哪个 module.

```ts
@ModuleQualifier(moduleName: string)
```

### 示例

```ts
import { Inject, InitTypeQualifier, ObjectInitType, EggLogger } from 'egg';

@SingletonProto()
export class HelloService {
  @Inject()
  // 明确指定使用来自 foo module 的 HelloAdapter
  @ModuleQualifier('foo')
  helloAdapter: HelloAdapter;
}
```

# Qualifier 动态注入

## 使用场景
我们代码中经常会在不同场景下有不同的实现，比较简单的做法是，在需要使用的地方去使用 if/else 或者 switch 去切换。但是这个面临的一个问题是，每次我们需要扩展一个类型时，至少需要修改两个地方，一个是增加实现，一个是在使用的地方增加代码分支。往往会产生遗漏，导致我们的代码出现问题。我们希望变更是收敛的，只要我们实现了就能动态的获取到。因此引入了动态注入的方式来解决这个问题。

## 使用
1. 定义一个抽象类和一个类型枚举。

```typescript
export enum HelloType {
  FOO = 'FOO',
  BAR = 'BAR',
}

// AbstractHello.ts
export abstract class AbstractHello {
  abstract hello(): string;
}
```



2. 定义一个自定义枚举。

:::danger
注意事项：

+ **ATTRIBUTE 不要重复了，可能会导致实现被覆盖**
+ **抽象类不要指定错了，可能导致实现被覆盖**

:::

```typescript
import { ImplDecorator, QualifierImplDecoratorUtil } from 'egg';
import { HelloType } from '../HelloType';
import { AbstractHello } from '../AbstractHello';

export const HELLO_ATTRIBUTE = Symbol('HELLO_ATTRIBUTE');

// 这个工具类可以实现类型检查
// 1. 加了这个注解一定要实现抽象类
// 2. 注解的参数一定是枚举值
export const Hello: ImplDecorator<AbstractHello, typeof HelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractHello, HELLO_ATTRIBUTE);
```



3. 实现抽象类。

```typescript
import { SingletonProto } from 'egg';
import { Hello } from '../decorator/Hello';
import { HelloType } from '../HelloType';
import { AbstractHello } from '../AbstractHello';

@SingletonProto()
@Hello(HelloType.BAR)
export class BarHello extends AbstractHello {
  hello(): string {
    return 'hello, bar';
  }
}
```



4. 动态获取实现。

```typescript
import { EggObjectFactory, SingletonProto, Inject } from 'egg';
import { HelloType } from './HelloType';
import { AbstractHello } from './AbstractHello';

@SingletonProto()
export class HelloService {
  @Inject()
  private eggObjectFactory: EggObjectFactory;

  async hello(): Promise<string> {
    const helloImpl = await this.eggObjectFactory.getEggObject(AbstractHello, HelloType.BAR);
    return helloImpl.hello();
  }
}
```

## FAQ
+ 如果我没有枚举，类型是无限扩展的怎么办？

```typescript
// 通过使用一个 record 来伪装成一个 enum
type AnyEnum = Record<string, string>;

export const Convertor: ImplDecorator<AbstractFoo, AnyEnum> = 
  QualifierImplDecoratorUtil.generatorDecorator(AbstractFoo, FOO_ATTRIBUTE);
```

