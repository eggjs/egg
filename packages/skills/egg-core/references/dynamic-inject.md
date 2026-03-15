# 动态注入开发指南

## 何时使用

- **用动态注入**：同一抽象有多种实现，运行时按参数选择（如多种支付方式、多种存储后端）
- **用普通 `@Inject()`**：依赖只有一个实现，编译时就能确定

## Step 1: 定义抽象类和类型枚举

```typescript
// AbstractHello.ts
export abstract class AbstractHello {
  abstract hello(): string;
}

// HelloType.ts
export enum HelloType {
  FOO = 'FOO',
  BAR = 'BAR',
}
```

如果类型是无限扩展的，没有固定枚举，可以用 `Record<string, string>` 代替：

```typescript
type AnyEnum = Record<string, string>;
```

## Step 2: 创建自定义装饰器

```typescript
// decorator/Hello.ts
import { ImplDecorator, QualifierImplDecoratorUtil } from 'egg';
import { HelloType } from '../HelloType.ts';
import { AbstractHello } from '../AbstractHello.ts';

export const HELLO_ATTRIBUTE = Symbol('HELLO_ATTRIBUTE');

export const Hello: ImplDecorator<AbstractHello, typeof HelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractHello, HELLO_ATTRIBUTE);
```

**注意事项：**

- **ATTRIBUTE（Symbol）不要重复**，重复会导致实现被覆盖
- **抽象类不要指定错**，否则可能导致实现被覆盖

## Step 3: 实现抽象类

每个实现加上 `@SingletonProto()`（或 `@ContextProto()`）和自定义装饰器：

```typescript
// impl/FooHello.ts
import { SingletonProto } from 'egg';
import { Hello } from '../decorator/Hello.ts';
import { HelloType } from '../HelloType.ts';
import { AbstractHello } from '../AbstractHello.ts';

@SingletonProto()
@Hello(HelloType.FOO)
export class FooHello extends AbstractHello {
  hello(): string {
    return 'hello, foo';
  }
}
```

## Step 4: 动态获取实现

通过 `EggObjectFactory` 在运行时按类型获取对应实现：

```typescript
// HelloService.ts
import { EggObjectFactory, SingletonProto, Inject } from 'egg';
import { HelloType } from './HelloType.ts';
import { AbstractHello } from './AbstractHello.ts';

@SingletonProto()
export class HelloService {
  @Inject()
  private eggObjectFactory: EggObjectFactory;

  async hello(type: HelloType): Promise<string> {
    const helloImpl = await this.eggObjectFactory.getEggObject(
      AbstractHello,
      type,
    );
    return helloImpl.hello();
  }
}
```
