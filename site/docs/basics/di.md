# Dependency Injection

## Proto

In domain-driven development, we generally place logic in Services. In Egg.js, this is implemented through `Proto`.

`Proto` provides configurable information:

- Instantiation method: instantiate per request / global singleton
- Access level: whether accessible outside the `Module`
- Instantiation name

## Instantiation Method

Includes two forms: `ContextProto` and `SingletonProto`. For specific details, please refer to the documentation below.

## Instantiation Name

This is crucial as it determines which instance should be injected with `@Inject`. By default, the first letter of the Proto class is converted to lowercase, e.g., `UserAdapter` becomes `userAdapter`.
If it doesn't meet expectations, you can manually specify it, for example:

```ts
// The instance name of MISTAdapter is mistAdapter
@SingletonProto({ name: 'mistAdapter' })
class MISTAdapter {}
```

## Access Level

All prototypes within a Module can be depended on (`@Inject`) by other prototypes in the same Module. Only prototypes with `accessLevel: AccessLevel.PUBLIC` can be accessed by other Modules. The default access level is `AccessLevel.PRIVATE`

```ts
root dir
└── app
    └── module
        ├── fooModule
        │   ├── Private.ts
        │   ├── Public.ts
        │   └── Access.ts  // Can Inject Private/Public
        └── barModule
            └── Access.ts  // Can only Inject Public
```

:::warning
Logic within a Module should be as cohesive as possible, exposing only necessary interfaces.
Once exposed, dependencies are created, and you must consider backward compatibility when changing interface code.
:::

## SingletonProto

### Definition

Similar to `ContextProto`, only one `SingletonProto` will be instantiated during the entire application lifecycle.

It's recommended to use `SingletonProto` by default, as it can improve application performance, and you can inject `ContextProto` objects within `SingletonProto`.

```ts
@SingletonProto({
  // The instantiation name of the prototype, optional
  name?: string;

  // Whether the object is accessible within the module or globally
  // Default value is AccessLevel.PRIVATE
  accessLevel?: AccessLevel;
})
```

### Example

```ts
// biz/HelloService.ts
import { SingletonProto } from 'egg';

@SingletonProto()
export class HelloService {
  async hello(): Promise<string> {
    return 'hello';
  }
}

@SingletonProto({
  name: 'worldInterface',
})
export class WorldService {
  async world(): Promise<string> {
    return 'world!';
  }
}
```

## ContextProto

### Definition

A `ContextProto` will be instantiated for each request.
:::info
Most `Service` classes are stateless and don't store request context. In such cases, it's recommended to use `SingletonProto` instead. This is because only one object needs to be initialized globally, rather than initializing an object for each request (which would degrade application performance).
For scenarios that need to store request context information and share it across multiple `Service` classes, you can use `ContextProto` to ensure objects obtained by different requests are isolated.
:::

```ts
enum AccessLevel {
  // Only accessible within module
  PRIVATE = 'PRIVATE',
  // Globally accessible
  PUBLIC = 'PUBLIC',
}

@ContextProto({
  // The instantiation name of the prototype, optional
  name?: string;

  // Whether the object is accessible within the module or globally
  // Default value is AccessLevel.PRIVATE
  accessLevel?: AccessLevel;
})
```

### Example

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

How to inject and use it:

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

## Inject

### Definition

Prototypes can depend on other prototypes or objects in Egg. Dependency injection is implemented through the `@Inject` decorator.

```ts
@Inject(param?: {
  // Name of the injected object, in some cases a prototype may have multiple instances
  // For example, egg's logger
  // Defaults to property name
  name?: string;
  // Name of the injected prototype
  // In some cases you don't want the injected prototype to use the same name as the property
  // Defaults to property name
  proto?: string;
})
```

### Example

```ts
import { Inject, SingletonProto, Logger } from 'egg';

@SingletonProto()
export class HelloService {
  @Inject()
  fooService: FooService; // Inject other prototype instances

  @Inject()
  logger: Logger; // Inject egg objects

  async hello(user: User): Promise<string> {
    this.logger.info(`[HelloService] hello ${this.fooService.hello()}`);
  }
}
```

### Usage Notes

There are several points to note when using Inject:

- Circular dependencies are not allowed between prototypes, e.g., Proto A - inject -> Proto B - inject-> Proto A
- Similarly, circular dependencies are not allowed between `Module`s
- A `Module` cannot have prototypes with the same instantiation method and name
- <font color=red>You cannot inject Egg's `ctx`/`app`, inject what you use</font>

#### The Role of Inject name

It allows the injected instance name to be different from the prototype instantiation, which is useful when using aliases.

```ts
/*** Define prototypes ***/
@SingletonProto()
export class HelloService {
  async hello(): Promise<string> {
    return 'hello';
  }
}

@SingletonProto({
  name: 'worldInterface',
})
export class WorldService {
  async world(): Promise<string> {
    return 'world!';
  }
}

/*** Inject prototypes ***/
@SingletonProto()
class Foo {
  @Inject()
  helloService: HelloService;

  @Inject({ name: 'helloService' })
  aliasHelloService: HelloService; // Equivalent to helloService above

  @Inject({ name: 'worldInterface' })
  worldService: WorldService;
}
```

#### The Role of Inject Type

Injection depends on the proto name, not the type, so the following code still works:

```ts
import { Inject, SingletonProto } from 'egg';

@SingletonProto()
class Foo {
  @Inject()
  redis: any; // Type defined as any can still inject redis from Egg Context
}
```

The role of the type here is only for TypeScript type hints (e.g., setting it to `any` just means missing Redis SDK API hints).

### Egg Compatibility

Module automatically traverses the `Context`/`Application` objects to get all their properties. <strong>All properties</strong> can be seamlessly injected, as in the common examples below:

#### Inject Egg Configuration

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

#### Inject logger

Optimized specifically for logger, you can directly inject custom loggers:

```ts
// config/config.default.ts
export default {
  customLogger: {
    fooLogger: {
      file: 'foo.log',
    },
  },
};
```

You can directly inject in the code:

```ts
import { Inject, SingletonProto, Logger } from 'egg';

@SingletonProto()
class FooService {
  // Inject ${appname}-web.log
  @Inject()
  logger: Logger;

  // Inject egg-web.log
  @Inject()
  coreLogger: Logger;

  // Inject customLogger named fooLogger
  @Inject()
  fooLogger: Logger;
}
```

#### Inject `Service`

:::warning
It is strongly recommended to re-encapsulate Egg Service code through `Proto` before injecting. For existing `Service` patterns, you can introduce them as follows:
:::

```ts
import { EggLogger, Service, Inject, SingletonProto } from 'egg';

@SingletonProto()
class FooService {
  // Inject the entire ctx.service, then get the corresponding xxxService
  @Inject()
  service: Service;

  get xxxService() {
    return this.service.xxxService;
  }
}
```

#### Inject `HttpClient`

```ts
import { Inject, SingletonProto, HttpClient } from 'egg';

@SingletonProto()
class Foo {
  @Inject()
  httpClient: HttpClient;

  async bar() {
    await this.httpClient.request('https://alipay.com');
  }
}
```

#### Inject Egg Methods

Since `Module` injection can only inject objects, not methods, if you need to use existing Egg methods, you need to encapsulate the methods.

For example: Suppose there's a method `getHeader` on `Context`. To use this method in `Module`, you need to encapsulate it as follows.

```ts
// extend/context.ts
export default {
  getHeader() {
    return '23333';
  },
};
```

First, encapsulate the method as an object.

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

Then put the object on the `Context` extension.

```ts
// extend/context.ts
const HEADER_HELPER = Symbol('context#headerHelper');

export default {
  get headerHelper() {
    if (!this[HEADER_HELPER]) {
      this[HEADER_HELPER] = new HeaderHelper(this);
    }
    return this[HEADER_HELPER];
  },
};
```

## Prototype Name Conflicts Within `Module`

### Definition

Within a `Module`, there are two prototypes with the same name but different instantiation methods. Direct `Inject` won't work because the `Module` cannot determine which object is needed.
In this case, you need to tell the `Module` which instantiation method the injected object should use.

```ts
@InitTypeQualifier(initType: ObjectInitType)
```

### Example

```ts
import {
  Logger,
  Inject,
  InitTypeQualifier,
  ObjectInitType,
  SingletonProto,
} from 'egg';

@SingletonProto()
export class HelloService {
  @Inject()
  // Explicitly specify logger with instantiation method CONTEXT
  @InitTypeQualifier(ObjectInitType.CONTEXT)
  logger: Logger;
}
```

## Prototype Name Conflicts Between `Module`s

### Definition

Multiple `Module`s may implement a prototype named `HelloService`. You need to explicitly tell the `Module` which `Module` the injected prototype comes from.

```ts
@ModuleQualifier(moduleName: string)
```

### Example

```ts
import { Inject, InitTypeQualifier, ObjectInitType, Logger } from 'egg';

@SingletonProto()
export class HelloService {
  @Inject()
  // Explicitly specify HelloAdapter from the foo `Module`
  @ModuleQualifier('foo')
  helloAdapter: HelloAdapter;
}
```

## Qualifier Dynamic Injection

### Use Cases

We often have different implementations for different scenarios in our code. A simple approach is to use if/else or switch at the point of use.
However, this presents a problem: every time we need to extend a type, we need to modify at least two places - one is to add the implementation, and the other is to add a code branch where it's used.
This often leads to omissions, causing issues in our code. We want changes to be converged, so that implementations are dynamically available once implemented.
Therefore, dynamic injection was introduced to solve this problem.

### Usage

1. Define an abstract class and a type enum.

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

2. Define a custom enum.

:::danger
Notes:

- **Don't duplicate ATTRIBUTE, as it may cause implementations to be overwritten**
- **Don't specify the wrong abstract class, as it may cause implementations to be overwritten**
  :::

```typescript
import { ImplDecorator, QualifierImplDecoratorUtil } from 'egg';
import { HelloType } from '../HelloType.ts';
import { AbstractHello } from '../AbstractHello.ts';

export const HELLO_ATTRIBUTE = Symbol('HELLO_ATTRIBUTE');

// This utility class can implement type checking
// 1. With this annotation, you must implement the abstract class
// 2. The annotation parameter must be an enum value
export const Hello: ImplDecorator<AbstractHello, typeof HelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractHello, HELLO_ATTRIBUTE);
```

3. Implement the abstract class.

```typescript
import { SingletonProto } from 'egg';
import { Hello } from '../decorator/Hello.ts';
import { HelloType } from '../HelloType.ts';
import { AbstractHello } from '../AbstractHello.ts';

@SingletonProto()
@Hello(HelloType.BAR)
export class BarHello extends AbstractHello {
  hello(): string {
    return 'hello, bar';
  }
}
```

4. Dynamically get the implementation.

```typescript
import { EggObjectFactory, SingletonProto, Inject } from 'egg';
import { HelloType } from './HelloType.ts';
import { AbstractHello } from './AbstractHello.ts';

@SingletonProto()
export class HelloService {
  @Inject()
  private eggObjectFactory: EggObjectFactory;

  async hello(): Promise<string> {
    const helloImpl = await this.eggObjectFactory.getEggObject(
      AbstractHello,
      HelloType.BAR,
    );
    return helloImpl.hello();
  }
}
```

### Real-World Example

[cnpmcore/app/common/adapter/binary/AbstractBinary.ts](https://github.com/cnpm/cnpmcore/blob/b6c96defa4c61783e1bf9a1b5dbe2420918ab69a/app/common/adapter/binary/AbstractBinary.ts#L136)

### FAQ

- What if I don't have an enum and the type is infinitely extensible?

```typescript
// Use a record to masquerade as an enum
type AnyEnum = Record<string, string>;

export const Convertor: ImplDecorator<AbstractFoo, AnyEnum> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractFoo, FOO_ATTRIBUTE);
```
